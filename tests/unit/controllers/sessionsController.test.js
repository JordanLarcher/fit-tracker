jest.mock('../../../models/sessions');
jest.mock('../../../models/user');

const Session = require('../../../models/sessions');
const User = require('../../../models/user');
const {
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
} = require('../../../controllers/sessionsController');
const { mockRequest, mockResponse } = require('../../helpers/mockExpress');

describe('controllers/sessionsController', () => {
  describe('getSessions', () => {
    it('returns paginated sessions for the current user', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ _id: 's1' }]),
      };
      Session.find.mockReturnValue(chain);
      Session.countDocuments.mockResolvedValue(1);

      const req = mockRequest({ query: {}, user: { _id: 'u1' } });
      const res = mockResponse();

      await getSessions(req, res);

      expect(Session.find).toHaveBeenCalledWith({ user: 'u1' });
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        total: 1,
        page: 1,
        pages: 1,
        data: [{ _id: 's1' }],
      });
    });

    it('applies page/limit from the query string', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      Session.find.mockReturnValue(chain);
      Session.countDocuments.mockResolvedValue(0);

      const req = mockRequest({ query: { page: '3', limit: '5' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await getSessions(req, res);

      expect(chain.skip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(chain.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('getSession', () => {
    it('returns 404 when the session does not exist or belongs to another user', async () => {
      const chain = { populate: jest.fn().mockResolvedValue(null) };
      Session.findOne.mockReturnValue(chain);

      const req = mockRequest({ params: { id: 's1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await getSession(req, res);

      expect(Session.findOne).toHaveBeenCalledWith({ _id: 's1', user: 'u1' });
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns the session when found', async () => {
      const session = { _id: 's1' };
      const chain = { populate: jest.fn().mockResolvedValue(session) };
      Session.findOne.mockReturnValue(chain);

      const req = mockRequest({ params: { id: 's1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await getSession(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: session });
    });
  });

  describe('createSession', () => {
    const baseUser = { _id: 'u1', streak: 0, lastWorkoutDate: null };

    beforeEach(() => {
      Session.create.mockResolvedValue({ _id: 's1' });
      User.findByIdAndUpdate.mockResolvedValue({});
    });

    it('sets streak to 1 for the first-ever session', async () => {
      User.findById.mockResolvedValue({ ...baseUser, lastWorkoutDate: null });

      const req = mockRequest({ body: { routine: 'r1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await createSession(req, res);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', expect.objectContaining({ streak: 1 }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('does not change the streak when already trained today', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      User.findById.mockResolvedValue({ ...baseUser, streak: 4, lastWorkoutDate: new Date() });

      const req = mockRequest({ body: { routine: 'r1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await createSession(req, res);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', expect.objectContaining({ streak: 4 }));
    });

    it('increments the streak when the last session was yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      User.findById.mockResolvedValue({ ...baseUser, streak: 4, lastWorkoutDate: yesterday });

      const req = mockRequest({ body: { routine: 'r1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await createSession(req, res);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', expect.objectContaining({ streak: 5 }));
    });

    it('resets the streak to 1 when the chain was broken', async () => {
      const longAgo = new Date();
      longAgo.setDate(longAgo.getDate() - 5);
      User.findById.mockResolvedValue({ ...baseUser, streak: 10, lastWorkoutDate: longAgo });

      const req = mockRequest({ body: { routine: 'r1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await createSession(req, res);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', expect.objectContaining({ streak: 1 }));
    });

    it('creates the session with the current user attached', async () => {
      User.findById.mockResolvedValue({ ...baseUser });
      const req = mockRequest({ body: { routine: 'r1', feeling: 'great' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await createSession(req, res);

      expect(Session.create).toHaveBeenCalledWith({ routine: 'r1', feeling: 'great', user: 'u1' });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { _id: 's1' } });
    });
  });

  describe('updateSession', () => {
    it('returns 404 when the session does not exist or belongs to another user', async () => {
      Session.findOneAndUpdate.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 's1' }, user: { _id: 'u1' }, body: {} });
      const res = mockResponse();

      await updateSession(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updates and returns the session', async () => {
      const updated = { _id: 's1', notes: 'updated' };
      Session.findOneAndUpdate.mockResolvedValue(updated);

      const req = mockRequest({ params: { id: 's1' }, user: { _id: 'u1' }, body: { notes: 'updated' } });
      const res = mockResponse();

      await updateSession(req, res);

      expect(Session.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 's1', user: 'u1' },
        { notes: 'updated' },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });
  });

  describe('deleteSession', () => {
    it('returns 404 when the session does not exist or belongs to another user', async () => {
      Session.findOneAndDelete.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 's1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await deleteSession(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes the session and returns 204', async () => {
      Session.findOneAndDelete.mockResolvedValue({ _id: 's1' });
      const req = mockRequest({ params: { id: 's1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await deleteSession(req, res);

      expect(Session.findOneAndDelete).toHaveBeenCalledWith({ _id: 's1', user: 'u1' });
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});

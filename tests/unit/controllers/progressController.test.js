jest.mock('../../../models/progress');
jest.mock('../../../models/sessions');

const Progress = require('../../../models/progress');
const Session = require('../../../models/sessions');
const {
  getProgress,
  getProgressEntry,
  createProgress,
  updateProgress,
  deleteProgress,
  getStats,
} = require('../../../controllers/progressController');
const { mockRequest, mockResponse } = require('../../helpers/mockExpress');

describe('controllers/progressController', () => {
  describe('getProgress', () => {
    it('filters by the current user, and optional session/exercise', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([{ _id: 'p1' }]),
      };
      Progress.find.mockReturnValue(chain);

      const req = mockRequest({ query: { sessionId: 's1', exerciseId: 'ex1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await getProgress(req, res);

      expect(Progress.find).toHaveBeenCalledWith({ user: 'u1', session: 's1', exercise: 'ex1' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, count: 1, data: [{ _id: 'p1' }] });
    });

    it('omits session/exercise filters when not provided', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      };
      Progress.find.mockReturnValue(chain);

      const req = mockRequest({ query: {}, user: { _id: 'u1' } });
      const res = mockResponse();

      await getProgress(req, res);

      expect(Progress.find).toHaveBeenCalledWith({ user: 'u1' });
    });
  });

  describe('getProgressEntry', () => {
    it('returns 404 when the entry does not exist', async () => {
      const chain = { populate: jest.fn().mockReturnThis() };
      chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(null);
      Progress.findOne.mockReturnValue(chain);

      const req = mockRequest({ params: { id: 'missing' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await getProgressEntry(req, res);

      expect(Progress.findOne).toHaveBeenCalledWith({ _id: 'missing', user: 'u1' });
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns the entry when found', async () => {
      const entry = { _id: 'p1' };
      const chain = { populate: jest.fn() };
      chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(entry);
      Progress.findOne.mockReturnValue(chain);

      const req = mockRequest({ params: { id: 'p1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await getProgressEntry(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: entry });
    });
  });

  describe('createProgress', () => {
    it('returns 404 when the session does not belong to the user', async () => {
      Session.findOne.mockResolvedValue(null);

      const req = mockRequest({ body: { session: 's1', exercise: 'ex1', sets: [] }, user: { _id: 'u1' } });
      const res = mockResponse();

      await createProgress(req, res);

      expect(Session.findOne).toHaveBeenCalledWith({ _id: 's1', user: 'u1' });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(Progress.create).not.toHaveBeenCalled();
    });

    it('creates the progress entry when the session belongs to the user', async () => {
      Session.findOne.mockResolvedValue({ _id: 's1' });
      const created = { _id: 'p1' };
      Progress.create.mockResolvedValue(created);

      const body = { session: 's1', exercise: 'ex1', sets: [{ setNumber: 1, reps: 10, weightKg: 20 }] };
      const req = mockRequest({ body, user: { _id: 'u1' } });
      const res = mockResponse();

      await createProgress(req, res);

      expect(Progress.create).toHaveBeenCalledWith({ ...body, user: 'u1' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: created });
    });
  });

  describe('updateProgress', () => {
    it('returns 404 when the entry does not exist', async () => {
      Progress.findOneAndUpdate.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 'missing' }, user: { _id: 'u1' }, body: {} });
      const res = mockResponse();

      await updateProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updates and returns the entry', async () => {
      const updated = { _id: 'p1' };
      Progress.findOneAndUpdate.mockResolvedValue(updated);
      const req = mockRequest({ params: { id: 'p1' }, user: { _id: 'u1' }, body: { sets: [] } });
      const res = mockResponse();

      await updateProgress(req, res);

      expect(Progress.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'p1', user: 'u1' },
        { sets: [] },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });
  });

  describe('deleteProgress', () => {
    it('returns 404 when the entry does not exist', async () => {
      Progress.findOneAndDelete.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 'missing' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await deleteProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes and returns 204', async () => {
      Progress.findOneAndDelete.mockResolvedValue({ _id: 'p1' });
      const req = mockRequest({ params: { id: 'p1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await deleteProgress(req, res);

      expect(Progress.findOneAndDelete).toHaveBeenCalledWith({ _id: 'p1', user: 'u1' });
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('getStats', () => {
    it('returns personal records and weekly volume from the aggregation results', async () => {
      const personalRecords = [{ exerciseName: 'Bench Press', maxWeight: 100 }];
      const weeklyVolume = [{ _id: { week: 1, year: 2026 }, totalVolume: 5000 }];
      Progress.aggregate
        .mockResolvedValueOnce(personalRecords)
        .mockResolvedValueOnce(weeklyVolume);

      const req = mockRequest({ user: { _id: 'u1' } });
      const res = mockResponse();

      await getStats(req, res);

      expect(Progress.aggregate).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { personalRecords, weeklyVolume },
      });
    });

    it('matches aggregations on the current user id', async () => {
      Progress.aggregate.mockResolvedValue([]);
      const req = mockRequest({ user: { _id: 'u1' } });
      const res = mockResponse();

      await getStats(req, res);

      const firstPipeline = Progress.aggregate.mock.calls[0][0];
      expect(firstPipeline[0]).toEqual({ $match: { user: 'u1' } });
    });
  });
});

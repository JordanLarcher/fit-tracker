jest.mock('../../../models/routines');

const Routine = require('../../../models/routines');
const {
  getRoutines,
  getRoutine,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  copyRoutine,
} = require('../../../controllers/routinesController');
const { mockRequest, mockResponse } = require('../../helpers/mockExpress');

describe('controllers/routinesController', () => {
  describe('getRoutines', () => {
    it('returns the user\'s own routines plus public ones', async () => {
      const routines = [{ name: 'Push Day' }];
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(routines),
      };
      Routine.find.mockReturnValue(chain);

      const req = mockRequest({ user: { _id: 'u1' } });
      const res = mockResponse();

      await getRoutines(req, res);

      expect(Routine.find).toHaveBeenCalledWith({ $or: [{ owner: 'u1' }, { isPublic: true }] });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, count: 1, data: routines });
    });
  });

  describe('getRoutine', () => {
    it('returns 404 when the routine does not exist', async () => {
      const chain = { populate: jest.fn().mockReturnThis() };
      chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(null);
      Routine.findById.mockReturnValue(chain);

      const req = mockRequest({ params: { id: 'missing' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await getRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 for a private routine belonging to someone else', async () => {
      const routine = { isPublic: false, owner: { _id: { toString: () => 'owner' } } };
      const chain = { populate: jest.fn() };
      chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(routine);
      Routine.findById.mockReturnValue(chain);

      const req = mockRequest({ params: { id: 'r1' }, user: { _id: 'someone-else' } });
      const res = mockResponse();

      await getRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns a public routine even when not the owner', async () => {
      const routine = { isPublic: true, owner: { _id: { toString: () => 'owner' } } };
      const chain = { populate: jest.fn() };
      chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(routine);
      Routine.findById.mockReturnValue(chain);

      const req = mockRequest({ params: { id: 'r1' }, user: { _id: 'someone-else' } });
      const res = mockResponse();

      await getRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: routine });
    });

    it('returns a private routine to its owner', async () => {
      const routine = { isPublic: false, owner: { _id: { toString: () => 'u1' } } };
      const chain = { populate: jest.fn() };
      chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(routine);
      Routine.findById.mockReturnValue(chain);

      const req = mockRequest({ params: { id: 'r1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await getRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createRoutine', () => {
    it('creates a routine owned by the current user', async () => {
      const created = { _id: 'r1', name: 'Push Day' };
      Routine.create.mockResolvedValue(created);

      const req = mockRequest({ body: { name: 'Push Day', exercises: [] }, user: { _id: 'u1' } });
      const res = mockResponse();

      await createRoutine(req, res);

      expect(Routine.create).toHaveBeenCalledWith({ name: 'Push Day', exercises: [], owner: 'u1' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: created });
    });
  });

  describe('updateRoutine', () => {
    it('returns 404 when the routine does not exist', async () => {
      Routine.findById.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 'missing' }, user: { _id: 'u1' }, body: {} });
      const res = mockResponse();

      await updateRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when a non-owner tries to update', async () => {
      Routine.findById.mockResolvedValue({ owner: { toString: () => 'owner' } });
      const req = mockRequest({ params: { id: 'r1' }, user: { _id: 'someone-else' }, body: {} });
      const res = mockResponse();

      await updateRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Only the owner can edit this routine.' });
    });

    it('updates the routine for its owner', async () => {
      Routine.findById.mockResolvedValue({ owner: { toString: () => 'u1' } });
      const updated = { _id: 'r1', name: 'Updated' };
      const chain = { populate: jest.fn().mockResolvedValue(updated) };
      Routine.findByIdAndUpdate.mockReturnValue(chain);

      const req = mockRequest({ params: { id: 'r1' }, user: { _id: 'u1' }, body: { name: 'Updated' } });
      const res = mockResponse();

      await updateRoutine(req, res);

      expect(Routine.findByIdAndUpdate).toHaveBeenCalledWith('r1', { name: 'Updated' }, { new: true, runValidators: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });
  });

  describe('deleteRoutine', () => {
    it('returns 404 when the routine does not exist', async () => {
      Routine.findById.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 'missing' }, user: { _id: 'u1', role: 'user' } });
      const res = mockResponse();

      await deleteRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 for a non-owner, non-admin', async () => {
      Routine.findById.mockResolvedValue({ owner: { toString: () => 'owner' } });
      const req = mockRequest({ params: { id: 'r1' }, user: { _id: 'someone-else', role: 'user' } });
      const res = mockResponse();

      await deleteRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('deletes the routine and returns 204 for the owner', async () => {
      const deleteOne = jest.fn().mockResolvedValue(undefined);
      Routine.findById.mockResolvedValue({ owner: { toString: () => 'u1' }, deleteOne });
      const req = mockRequest({ params: { id: 'r1' }, user: { _id: 'u1', role: 'user' } });
      const res = mockResponse();

      await deleteRoutine(req, res);

      expect(deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('allows an admin to delete someone else\'s routine', async () => {
      const deleteOne = jest.fn().mockResolvedValue(undefined);
      Routine.findById.mockResolvedValue({ owner: { toString: () => 'owner' }, deleteOne });
      const req = mockRequest({ params: { id: 'r1' }, user: { _id: 'admin1', role: 'admin' } });
      const res = mockResponse();

      await deleteRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('copyRoutine', () => {
    it('returns 404 when the source routine does not exist', async () => {
      Routine.findById.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 'missing' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await copyRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 for a private routine belonging to someone else', async () => {
      Routine.findById.mockResolvedValue({ isPublic: false, owner: { toString: () => 'owner' } });
      const req = mockRequest({ params: { id: 'r1' }, user: { _id: 'someone-else' } });
      const res = mockResponse();

      await copyRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('copies a public routine for the requesting user', async () => {
      const source = {
        isPublic: true,
        owner: { toString: () => 'owner' },
        name: 'Push Day',
        description: 'Chest day',
        exercises: [{ exercise: 'ex1', sets: 3, reps: 10 }],
        tags: ['strength'],
      };
      Routine.findById.mockResolvedValue(source);
      const copy = { _id: 'r2', name: 'Push Day (copy)' };
      Routine.create.mockResolvedValue(copy);

      const req = mockRequest({ params: { id: 'r1' }, user: { _id: 'u2' } });
      const res = mockResponse();

      await copyRoutine(req, res);

      expect(Routine.create).toHaveBeenCalledWith({
        name: 'Push Day (copy)',
        description: 'Chest day',
        exercises: source.exercises,
        owner: 'u2',
        isPublic: false,
        tags: ['strength'],
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: copy });
    });

    it('allows the owner to copy their own private routine', async () => {
      const source = {
        isPublic: false,
        owner: { toString: () => 'u1' },
        name: 'Leg Day',
        description: '',
        exercises: [],
        tags: [],
      };
      Routine.findById.mockResolvedValue(source);
      Routine.create.mockResolvedValue({ _id: 'r2' });

      const req = mockRequest({ params: { id: 'r1' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await copyRoutine(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});

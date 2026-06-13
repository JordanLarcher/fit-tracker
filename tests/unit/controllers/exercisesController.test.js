jest.mock('../../../models/exercises');

const Exercise = require('../../../models/exercises');
const {
  getExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  getExerciseGif,
} = require('../../../controllers/exercisesController');
const { mockRequest, mockResponse } = require('../../helpers/mockExpress');

// Builds a chainable mock for Exercise.find().skip().limit().sort()
const buildFindChain = (result) => ({
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  sort: jest.fn().mockResolvedValue(result),
});

describe('controllers/exercisesController', () => {
  describe('getExercises', () => {
    it('returns paginated public exercises with default pagination', async () => {
      const chain = buildFindChain([{ name: 'Push-up' }]);
      Exercise.find.mockReturnValue(chain);
      Exercise.countDocuments.mockResolvedValue(1);

      const req = mockRequest({ query: {} });
      const res = mockResponse();

      await getExercises(req, res);

      expect(Exercise.find).toHaveBeenCalledWith({ $or: [{ isPublic: true }] });
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(20);
      expect(chain.sort).toHaveBeenCalledWith({ name: 1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        total: 1,
        page: 1,
        pages: 1,
        data: [{ name: 'Push-up' }],
      });
    });

    it('includes the user\'s own private exercises when authenticated', async () => {
      const chain = buildFindChain([]);
      Exercise.find.mockReturnValue(chain);
      Exercise.countDocuments.mockResolvedValue(0);

      const req = mockRequest({ query: {}, user: { _id: 'u1' } });
      const res = mockResponse();

      await getExercises(req, res);

      expect(Exercise.find).toHaveBeenCalledWith({
        $or: [{ isPublic: true }, { createdBy: 'u1' }],
      });
    });

    it('applies search, filters, and pagination from the query string', async () => {
      const chain = buildFindChain([]);
      Exercise.find.mockReturnValue(chain);
      Exercise.countDocuments.mockResolvedValue(0);

      const req = mockRequest({
        query: { search: 'press', bodyPart: 'Chest', equipment: 'Barbell', difficulty: 'BEGINNER', page: '2', limit: '5' },
      });
      const res = mockResponse();

      await getExercises(req, res);

      expect(Exercise.find).toHaveBeenCalledWith({
        $or: [{ isPublic: true }],
        $text: { $search: 'press' },
        bodyPart: 'chest',
        equipment: 'barbell',
        difficulty: 'beginner',
      });
      expect(chain.skip).toHaveBeenCalledWith(5); // (page 2 - 1) * limit 5
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(chain.sort).toHaveBeenCalledWith({ score: { $meta: 'textScore' } });
    });
  });

  describe('getExercise', () => {
    it('returns 404 when the exercise does not exist', async () => {
      Exercise.findById.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 'missing' } });
      const res = mockResponse();

      await getExercise(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 for a private exercise belonging to someone else', async () => {
      Exercise.findById.mockResolvedValue({ isPublic: false, createdBy: { toString: () => 'owner' } });
      const req = mockRequest({ params: { id: 'ex1' }, user: { _id: 'someone-else' } });
      const res = mockResponse();

      await getExercise(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 for a private exercise when not authenticated', async () => {
      Exercise.findById.mockResolvedValue({ isPublic: false, createdBy: { toString: () => 'owner' } });
      const req = mockRequest({ params: { id: 'ex1' } });
      const res = mockResponse();

      await getExercise(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns the exercise for a public exercise', async () => {
      const exercise = { isPublic: true, name: 'Push-up' };
      Exercise.findById.mockResolvedValue(exercise);
      const req = mockRequest({ params: { id: 'ex1' } });
      const res = mockResponse();

      await getExercise(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: exercise });
    });

    it('returns a private exercise to its owner', async () => {
      const exercise = { isPublic: false, createdBy: { toString: () => 'owner' }, name: 'Custom' };
      Exercise.findById.mockResolvedValue(exercise);
      const req = mockRequest({ params: { id: 'ex1' }, user: { _id: 'owner' } });
      const res = mockResponse();

      await getExercise(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createExercise', () => {
    it('creates an exercise tagged with createdBy', async () => {
      const created = { _id: 'ex1', name: 'Push-up' };
      Exercise.create.mockResolvedValue(created);

      const req = mockRequest({ body: { name: 'Push-up', bodyPart: 'chest' }, user: { _id: 'u1' } });
      const res = mockResponse();

      await createExercise(req, res);

      expect(Exercise.create).toHaveBeenCalledWith({ name: 'Push-up', bodyPart: 'chest', createdBy: 'u1' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: created });
    });

    it('splits comma-separated secondaryMuscles and newline-separated instructions', async () => {
      Exercise.create.mockResolvedValue({});
      const req = mockRequest({
        body: {
          name: 'Push-up',
          secondaryMuscles: 'triceps, shoulders ,  core',
          instructions: 'Step one\nStep two\n  Step three  \n',
        },
        user: { _id: 'u1' },
      });
      const res = mockResponse();

      await createExercise(req, res);

      expect(Exercise.create).toHaveBeenCalledWith({
        name: 'Push-up',
        secondaryMuscles: ['triceps', 'shoulders', 'core'],
        instructions: ['Step one', 'Step two', 'Step three'],
        createdBy: 'u1',
      });
    });
  });

  describe('updateExercise', () => {
    it('returns 404 when the exercise does not exist', async () => {
      Exercise.findById.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 'missing' }, user: { _id: 'u1', role: 'user' } });
      const res = mockResponse();

      await updateExercise(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when a non-owner, non-admin tries to update', async () => {
      Exercise.findById.mockResolvedValue({ createdBy: { toString: () => 'owner' } });
      const req = mockRequest({ params: { id: 'ex1' }, user: { _id: 'someone-else', role: 'user' }, body: {} });
      const res = mockResponse();

      await updateExercise(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(Exercise.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('allows the owner to update', async () => {
      Exercise.findById.mockResolvedValue({ createdBy: { toString: () => 'u1' } });
      const updated = { _id: 'ex1', name: 'Updated' };
      Exercise.findByIdAndUpdate.mockResolvedValue(updated);

      const req = mockRequest({ params: { id: 'ex1' }, user: { _id: 'u1', role: 'user' }, body: { name: 'Updated' } });
      const res = mockResponse();

      await updateExercise(req, res);

      expect(Exercise.findByIdAndUpdate).toHaveBeenCalledWith('ex1', { name: 'Updated' }, { new: true, runValidators: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });

    it('allows an admin to update someone else\'s exercise', async () => {
      Exercise.findById.mockResolvedValue({ createdBy: { toString: () => 'owner' } });
      Exercise.findByIdAndUpdate.mockResolvedValue({});

      const req = mockRequest({ params: { id: 'ex1' }, user: { _id: 'admin1', role: 'admin' }, body: {} });
      const res = mockResponse();

      await updateExercise(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteExercise', () => {
    it('returns 404 when the exercise does not exist', async () => {
      Exercise.findById.mockResolvedValue(null);
      const req = mockRequest({ params: { id: 'missing' }, user: { _id: 'u1', role: 'user' } });
      const res = mockResponse();

      await deleteExercise(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when a non-owner, non-admin tries to delete', async () => {
      Exercise.findById.mockResolvedValue({ createdBy: { toString: () => 'owner' } });
      const req = mockRequest({ params: { id: 'ex1' }, user: { _id: 'someone-else', role: 'user' } });
      const res = mockResponse();

      await deleteExercise(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('deletes the exercise and returns 204 for the owner', async () => {
      const deleteOne = jest.fn().mockResolvedValue(undefined);
      Exercise.findById.mockResolvedValue({ createdBy: { toString: () => 'u1' }, deleteOne });
      const req = mockRequest({ params: { id: 'ex1' }, user: { _id: 'u1', role: 'user' } });
      const res = mockResponse();

      await deleteExercise(req, res);

      expect(deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('getExerciseGif', () => {
    const originalFetch = global.fetch;
    const originalKey = process.env.RAPIDAPI_KEY;

    afterEach(() => {
      global.fetch = originalFetch;
      process.env.RAPIDAPI_KEY = originalKey;
    });

    it('returns 404 when the exercise has no externalId', async () => {
      Exercise.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ externalId: undefined }) });
      const req = mockRequest({ params: { id: 'ex1' }, query: {} });
      const res = mockResponse();

      await getExerciseGif(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 503 when RAPIDAPI_KEY is not configured', async () => {
      delete process.env.RAPIDAPI_KEY;
      Exercise.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ externalId: '0001' }) });
      const req = mockRequest({ params: { id: 'ex1' }, query: {} });
      const res = mockResponse();

      await getExerciseGif(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('returns 502 when the upstream request fails', async () => {
      process.env.RAPIDAPI_KEY = 'test-key';
      Exercise.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ externalId: '0001' }) });
      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      const req = mockRequest({ params: { id: 'ex1' }, query: {} });
      const res = mockResponse();

      await getExerciseGif(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
    });

    it('streams the gif buffer with the upstream content-type on success', async () => {
      process.env.RAPIDAPI_KEY = 'test-key';
      Exercise.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ externalId: '0001' }) });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'image/gif' },
        arrayBuffer: async () => new ArrayBuffer(4),
      });

      const req = mockRequest({ params: { id: 'ex1' }, query: { resolution: '360' } });
      const res = mockResponse();

      await getExerciseGif(req, res);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('resolution=360&exerciseId=0001'),
        expect.objectContaining({ headers: expect.objectContaining({ 'X-RapidAPI-Key': 'test-key' }) })
      );
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/gif');
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('falls back to image/gif when the upstream omits a content-type header', async () => {
      process.env.RAPIDAPI_KEY = 'test-key';
      Exercise.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ externalId: '0001' }) });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: async () => new ArrayBuffer(4),
      });

      const req = mockRequest({ params: { id: 'ex1' }, query: {} });
      const res = mockResponse();

      await getExerciseGif(req, res);

      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/gif');
    });
  });
});

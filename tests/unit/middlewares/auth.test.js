jest.mock('../../../models/user');

const User = require('../../../models/user');
const { signToken } = require('../../../utils/token');
const { protect, restrictTo } = require('../../../middlewares/auth');
const { mockRequest, mockResponse, mockNext } = require('../../helpers/mockExpress');

describe('middlewares/auth', () => {
  describe('protect', () => {
    it('returns 401 when no Authorization header is present', async () => {
      const req = mockRequest({ headers: {} });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required. Please log in.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the Authorization header does not start with "Bearer "', async () => {
      const req = mockRequest({ headers: { authorization: 'Basic abc123' } });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 with a JsonWebTokenError message for a malformed token', async () => {
      const req = mockRequest({ headers: { authorization: 'Bearer not-a-real-token' } });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token. Please log in again.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 with an expiry message for an expired token', async () => {
      const token = signToken({ id: 'user1' }, '-1s');
      const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Your session has expired. Please log in again.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when the user from the token no longer exists', async () => {
      User.findById.mockResolvedValue(null);
      const token = signToken({ id: 'deleted-user' });
      const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(User.findById).toHaveBeenCalledWith('deleted-user');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('attaches the user to req and calls next() for a valid token', async () => {
      const fakeUser = { _id: 'user1', email: 'a@b.com', role: 'user' };
      User.findById.mockResolvedValue(fakeUser);
      const token = signToken({ id: 'user1' });
      const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
      const res = mockResponse();
      const next = mockNext();

      await protect(req, res, next);

      expect(req.user).toBe(fakeUser);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('restrictTo', () => {
    it('calls next() when the user role is in the allowed list', () => {
      const req = mockRequest({ user: { role: 'admin' } });
      const res = mockResponse();
      const next = mockNext();

      restrictTo('admin', 'coach')(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when the user role is not in the allowed list', () => {
      const req = mockRequest({ user: { role: 'user' } });
      const res = mockResponse();
      const next = mockNext();

      restrictTo('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

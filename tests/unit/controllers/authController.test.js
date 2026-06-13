jest.mock('../../../models/user');
jest.mock('../../../utils/email');

const crypto = require('crypto');
const User = require('../../../models/user');
const { sendPasswordResetEmail } = require('../../../utils/email');
const {
  register,
  login,
  getMe,
  refresh,
  forgotPassword,
  resetPassword,
  googleCallback,
} = require('../../../controllers/authController');
const { mockRequest, mockResponse } = require('../../helpers/mockExpress');

describe('controllers/authController', () => {
  describe('register', () => {
    it('returns 409 if the email is already registered', async () => {
      User.findOne.mockResolvedValue({ _id: 'existing' });
      const req = mockRequest({ body: { name: 'Jordan', email: 'a@b.com', password: 'pw' } });
      const res = mockResponse();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'An account with this email already exists.',
      });
    });

    it('creates the user and returns a token on success', async () => {
      User.findOne.mockResolvedValue(null);
      const fakeUser = {
        _id: 'u1',
        email: 'a@b.com',
        role: 'user',
        toPublicJSON: () => ({ _id: 'u1', email: 'a@b.com', name: 'Jordan' }),
      };
      User.create.mockResolvedValue(fakeUser);

      const req = mockRequest({ body: { name: 'Jordan', email: 'a@b.com', password: 'pw123456' } });
      const res = mockResponse();

      await register(req, res);

      expect(User.create).toHaveBeenCalledWith({ name: 'Jordan', email: 'a@b.com', password: 'pw123456' });
      expect(res.status).toHaveBeenCalledWith(201);
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(typeof payload.token).toBe('string');
      expect(payload.user).toEqual({ _id: 'u1', email: 'a@b.com', name: 'Jordan' });
    });
  });

  describe('login', () => {
    it('returns 401 with a generic message when the user does not exist', async () => {
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      const req = mockRequest({ body: { email: 'nobody@b.com', password: 'pw' } });
      const res = mockResponse();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password.',
      });
    });

    it('returns 401 with a generic message when the password is wrong', async () => {
      const fakeUser = { _id: 'u1', comparePassword: jest.fn().mockResolvedValue(false) };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
      const req = mockRequest({ body: { email: 'a@b.com', password: 'wrong' } });
      const res = mockResponse();

      await login(req, res);

      expect(fakeUser.comparePassword).toHaveBeenCalledWith('wrong');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password.',
      });
    });

    it('returns a token and user on valid credentials', async () => {
      const fakeUser = {
        _id: 'u1',
        email: 'a@b.com',
        role: 'user',
        comparePassword: jest.fn().mockResolvedValue(true),
        toPublicJSON: () => ({ _id: 'u1', email: 'a@b.com' }),
      };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
      const req = mockRequest({ body: { email: 'a@b.com', password: 'correct' } });
      const res = mockResponse();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(typeof payload.token).toBe('string');
      expect(payload.user).toEqual({ _id: 'u1', email: 'a@b.com' });
    });
  });

  describe('getMe', () => {
    it('returns the current user from req.user', async () => {
      const req = mockRequest({ user: { toPublicJSON: () => ({ _id: 'u1', name: 'Jordan' }) } });
      const res = mockResponse();

      await getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, user: { _id: 'u1', name: 'Jordan' } });
    });
  });

  describe('refresh', () => {
    it('returns a new token signed from req.user', async () => {
      const req = mockRequest({ user: { _id: 'u1', email: 'a@b.com', role: 'user' } });
      const res = mockResponse();

      await refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(typeof payload.token).toBe('string');
      expect(payload.expiresIn).toBe(process.env.JWT_EXPIRES_IN);
    });
  });

  describe('forgotPassword', () => {
    it('returns a generic success message when the email is not registered (no leak)', async () => {
      User.findOne.mockResolvedValue(null);
      const req = mockRequest({ body: { email: 'nobody@b.com' } });
      const res = mockResponse();

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('generates a reset token and sends an email when the user exists', async () => {
      const fakeUser = {
        email: 'a@b.com',
        generateResetToken: jest.fn().mockReturnValue('raw-token'),
        save: jest.fn().mockResolvedValue(undefined),
      };
      User.findOne.mockResolvedValue(fakeUser);
      sendPasswordResetEmail.mockResolvedValue(undefined);

      const req = mockRequest({
        body: { email: 'a@b.com' },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
      });
      const res = mockResponse();

      await forgotPassword(req, res);

      expect(fakeUser.generateResetToken).toHaveBeenCalled();
      expect(fakeUser.save).toHaveBeenCalledWith({ validateBeforeSave: false });
      expect(sendPasswordResetEmail).toHaveBeenCalledWith('a@b.com', 'http://localhost:3000/reset-password/raw-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'If that email is registered, you will receive a password reset link.',
      });
    });

    it('clears the reset token and returns 500 when sending the email fails', async () => {
      const fakeUser = {
        email: 'a@b.com',
        passwordResetToken: 'hashed',
        passwordResetExpires: new Date(),
        generateResetToken: jest.fn().mockReturnValue('raw-token'),
        save: jest.fn().mockResolvedValue(undefined),
      };
      User.findOne.mockResolvedValue(fakeUser);
      sendPasswordResetEmail.mockRejectedValue(new Error('SMTP down'));

      const req = mockRequest({
        body: { email: 'a@b.com' },
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
      });
      const res = mockResponse();

      await forgotPassword(req, res);

      expect(fakeUser.passwordResetToken).toBeUndefined();
      expect(fakeUser.passwordResetExpires).toBeUndefined();
      expect(fakeUser.save).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('resetPassword', () => {
    it('returns 400 when the token is invalid or expired', async () => {
      User.findOne.mockResolvedValue(null);
      const req = mockRequest({ params: { token: 'sometoken' }, body: { password: 'newpassword123' } });
      const res = mockResponse();

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token is invalid or has expired.',
      });
    });

    it('updates the password, clears reset fields, and returns a new token', async () => {
      const fakeUser = {
        _id: 'u1',
        email: 'a@b.com',
        role: 'user',
        passwordResetToken: 'hashed',
        passwordResetExpires: new Date(),
        save: jest.fn().mockResolvedValue(undefined),
        toPublicJSON: () => ({ _id: 'u1', email: 'a@b.com' }),
      };
      User.findOne.mockResolvedValue(fakeUser);

      const rawToken = 'sometoken';
      const req = mockRequest({ params: { token: rawToken }, body: { password: 'newpassword123' } });
      const res = mockResponse();

      await resetPassword(req, res);

      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(User.findOne).toHaveBeenCalledWith({
        passwordResetToken: expectedHash,
        passwordResetExpires: { $gt: expect.any(Number) },
      });
      expect(fakeUser.password).toBe('newpassword123');
      expect(fakeUser.passwordResetToken).toBeUndefined();
      expect(fakeUser.passwordResetExpires).toBeUndefined();
      expect(fakeUser.save).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(typeof payload.token).toBe('string');
    });
  });

  describe('googleCallback', () => {
    it('redirects to the success page with the token from req.user', async () => {
      const req = mockRequest({ user: { token: 'oauth-token' } });
      const res = mockResponse();

      await googleCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/auth/google/success?token=oauth-token');
    });
  });
});

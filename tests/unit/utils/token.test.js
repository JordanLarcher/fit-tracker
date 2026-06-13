const jwt = require('jsonwebtoken');
const { signToken, verifyToken } = require('../../../utils/token');

describe('utils/token', () => {
  describe('signToken', () => {
    it('signs a payload into a verifiable JWT using JWT_SECRET', () => {
      const token = signToken({ id: 'abc123', email: 'a@b.com', role: 'user' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.id).toBe('abc123');
      expect(decoded.email).toBe('a@b.com');
      expect(decoded.role).toBe('user');
    });

    it('uses the provided expiresIn override', () => {
      const token = signToken({ id: 'abc123' }, '5m');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const lifetimeSeconds = decoded.exp - decoded.iat;
      expect(lifetimeSeconds).toBe(5 * 60);
    });
  });

  describe('verifyToken', () => {
    it('returns the decoded payload for a valid token', () => {
      const token = signToken({ id: 'xyz789' });
      const decoded = verifyToken(token);
      expect(decoded.id).toBe('xyz789');
    });

    it('throws JsonWebTokenError for a malformed token', () => {
      expect(() => verifyToken('not-a-real-token')).toThrow(jwt.JsonWebTokenError);
    });

    it('throws TokenExpiredError for an expired token', () => {
      const token = signToken({ id: 'xyz789' }, '-1s');
      expect(() => verifyToken(token)).toThrow(jwt.TokenExpiredError);
    });

    it('throws JsonWebTokenError when signed with a different secret', () => {
      const token = jwt.sign({ id: 'xyz789' }, 'wrong-secret');
      expect(() => verifyToken(token)).toThrow(jwt.JsonWebTokenError);
    });
  });
});

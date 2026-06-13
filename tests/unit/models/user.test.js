const User = require('../../../models/user');

describe('models/user', () => {
  describe('pre-save password hashing hook', () => {
    it('hashes the password when it is new/modified', async () => {
      const user = new User({ name: 'Jordan', email: 'jordan@example.com', password: 'plaintext123' });

      // save() requires a DB connection, so invoke the pre-save hook directly.
      const hooks = user.schema.s.hooks._pres.get('save') || [];
      for (const hook of hooks) {
        await hook.fn.call(user);
      }

      expect(user.password).not.toBe('plaintext123');
      expect(user.password.startsWith('$2')).toBe(true); // bcrypt hash prefix
    });

    it('does not rehash the password when it has not been modified', async () => {
      const user = new User({ name: 'Jordan', email: 'jordan@example.com', password: 'plaintext123' });
      const hooks = user.schema.s.hooks._pres.get('save') || [];

      for (const hook of hooks) await hook.fn.call(user);
      const firstHash = user.password;

      user.isModified = jest.fn().mockReturnValue(false);
      for (const hook of hooks) await hook.fn.call(user);

      expect(user.password).toBe(firstHash);
    });
  });

  describe('comparePassword', () => {
    it('returns true for the correct password', async () => {
      const user = new User({ name: 'Jordan', email: 'jordan@example.com', password: 'plaintext123' });
      const hooks = user.schema.s.hooks._pres.get('save') || [];
      for (const hook of hooks) await hook.fn.call(user);

      await expect(user.comparePassword('plaintext123')).resolves.toBe(true);
    });

    it('returns false for an incorrect password', async () => {
      const user = new User({ name: 'Jordan', email: 'jordan@example.com', password: 'plaintext123' });
      const hooks = user.schema.s.hooks._pres.get('save') || [];
      for (const hook of hooks) await hook.fn.call(user);

      await expect(user.comparePassword('wrong-password')).resolves.toBe(false);
    });
  });

  describe('toPublicJSON', () => {
    it('strips password, __v, and password reset fields', () => {
      const user = new User({
        name: 'Jordan',
        email: 'jordan@example.com',
        password: 'hashedvalue',
      });
      user.passwordResetToken = 'sometoken';
      user.passwordResetExpires = new Date();

      const json = user.toPublicJSON();

      expect(json.password).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.passwordResetToken).toBeUndefined();
      expect(json.passwordResetExpires).toBeUndefined();
      expect(json.name).toBe('Jordan');
      expect(json.email).toBe('jordan@example.com');
    });
  });

  describe('generateResetToken', () => {
    it('sets a hashed passwordResetToken and an expiry ~1 hour out, and returns the raw token', () => {
      const user = new User({ name: 'Jordan', email: 'jordan@example.com', password: 'plaintext123' });
      const before = Date.now();

      const rawToken = user.generateResetToken();

      expect(typeof rawToken).toBe('string');
      expect(rawToken).toHaveLength(64); // 32 bytes hex-encoded
      expect(user.passwordResetToken).toHaveLength(64); // sha256 hex digest
      expect(user.passwordResetToken).not.toBe(rawToken);

      const oneHour = 60 * 60 * 1000;
      expect(user.passwordResetExpires - before).toBeGreaterThan(oneHour - 1000);
      expect(user.passwordResetExpires - before).toBeLessThanOrEqual(oneHour + 1000);
    });
  });

  describe('schema validation', () => {
    it('requires name, email, and a valid email format', async () => {
      const user = new User({ name: 'Jordan', email: 'not-an-email', password: 'plaintext123' });
      await expect(user.validate()).rejects.toThrow();
    });

    it('rejects a password shorter than 8 characters', async () => {
      const user = new User({ name: 'Jordan', email: 'jordan@example.com', password: 'short' });
      await expect(user.validate()).rejects.toThrow();
    });

    it('defaults role to "user" and streak to 0', () => {
      const user = new User({ name: 'Jordan', email: 'jordan@example.com', password: 'plaintext123' });
      expect(user.role).toBe('user');
      expect(user.streak).toBe(0);
    });
  });
});

// Test environment variables — independent of .env so tests are deterministic.
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

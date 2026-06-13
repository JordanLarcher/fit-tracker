const express = require('express');
const request = require('supertest');
const {
  validateRegister,
  validateLogin,
  validateExercise,
  validateRoutine,
  validateSession,
  validateProgress,
  validateForgotPassword,
  validateResetPassword,
} = require('../../../middlewares/validate');

// Builds a tiny app that applies a validation chain and echoes 200 on success.
const buildApp = (chain) => {
  const app = express();
  app.use(express.json());
  app.post('/test', chain, (req, res) => res.status(200).json({ success: true }));
  return app;
};

describe('middlewares/validate', () => {
  describe('validateRegister', () => {
    const app = buildApp(validateRegister);

    it('passes with valid name, email, and password', async () => {
      const res = await request(app)
        .post('/test')
        .send({ name: 'Jordan', email: 'jordan@example.com', password: 'longenough' });

      expect(res.status).toBe(200);
    });

    it('rejects an empty name', async () => {
      const res = await request(app)
        .post('/test')
        .send({ name: '', email: 'jordan@example.com', password: 'longenough' });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('rejects an invalid email', async () => {
      const res = await request(app)
        .post('/test')
        .send({ name: 'Jordan', email: 'not-an-email', password: 'longenough' });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
    });

    it('rejects a password shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/test')
        .send({ name: 'Jordan', email: 'jordan@example.com', password: 'short' });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
    });
  });

  describe('validateLogin', () => {
    const app = buildApp(validateLogin);

    it('passes with a valid email and non-empty password', async () => {
      const res = await request(app)
        .post('/test')
        .send({ email: 'jordan@example.com', password: 'anything' });

      expect(res.status).toBe(200);
    });

    it('rejects a missing password', async () => {
      const res = await request(app)
        .post('/test')
        .send({ email: 'jordan@example.com', password: '' });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
    });
  });

  describe('validateExercise', () => {
    const app = buildApp(validateExercise);

    it('passes with all required fields', async () => {
      const res = await request(app).post('/test').send({
        name: 'Push-up',
        bodyPart: 'chest',
        equipment: 'body weight',
        target: 'pectorals',
      });

      expect(res.status).toBe(200);
    });

    it('rejects a missing required field', async () => {
      const res = await request(app).post('/test').send({
        name: 'Push-up',
        bodyPart: 'chest',
        equipment: 'body weight',
        // target missing
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'target')).toBe(true);
    });

    it('rejects an invalid difficulty value', async () => {
      const res = await request(app).post('/test').send({
        name: 'Push-up',
        bodyPart: 'chest',
        equipment: 'body weight',
        target: 'pectorals',
        difficulty: 'expert',
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'difficulty')).toBe(true);
    });
  });

  describe('validateRoutine', () => {
    const app = buildApp(validateRoutine);
    const validExerciseId = '507f1f77bcf86cd799439011';

    it('passes with a valid routine', async () => {
      const res = await request(app).post('/test').send({
        name: 'Push Day',
        exercises: [{ exercise: validExerciseId, sets: 3, reps: 10 }],
      });

      expect(res.status).toBe(200);
    });

    it('rejects a routine with no exercises', async () => {
      const res = await request(app).post('/test').send({
        name: 'Push Day',
        exercises: [],
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'exercises')).toBe(true);
    });

    it('rejects an exercise with an invalid id', async () => {
      const res = await request(app).post('/test').send({
        name: 'Push Day',
        exercises: [{ exercise: 'not-an-id', sets: 3, reps: 10 }],
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'exercises[0].exercise')).toBe(true);
    });

    it('rejects sets out of range', async () => {
      const res = await request(app).post('/test').send({
        name: 'Push Day',
        exercises: [{ exercise: validExerciseId, sets: 25, reps: 10 }],
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'exercises[0].sets')).toBe(true);
    });
  });

  describe('validateSession', () => {
    const app = buildApp(validateSession);
    const validRoutineId = '507f1f77bcf86cd799439011';

    it('passes with a valid routine id', async () => {
      const res = await request(app).post('/test').send({ routine: validRoutineId });
      expect(res.status).toBe(200);
    });

    it('rejects an invalid routine id', async () => {
      const res = await request(app).post('/test').send({ routine: 'not-an-id' });
      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'routine')).toBe(true);
    });

    it('rejects an invalid feeling value', async () => {
      const res = await request(app)
        .post('/test')
        .send({ routine: validRoutineId, feeling: 'ecstatic' });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'feeling')).toBe(true);
    });
  });

  describe('validateProgress', () => {
    const app = buildApp(validateProgress);
    const id = '507f1f77bcf86cd799439011';

    it('passes with a valid progress entry', async () => {
      const res = await request(app).post('/test').send({
        session: id,
        exercise: id,
        sets: [{ setNumber: 1, reps: 10, weightKg: 20 }],
      });

      expect(res.status).toBe(200);
    });

    it('rejects an empty sets array', async () => {
      const res = await request(app).post('/test').send({
        session: id,
        exercise: id,
        sets: [],
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'sets')).toBe(true);
    });

    it('rejects a negative weight', async () => {
      const res = await request(app).post('/test').send({
        session: id,
        exercise: id,
        sets: [{ setNumber: 1, reps: 10, weightKg: -5 }],
      });

      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'sets[0].weightKg')).toBe(true);
    });
  });

  describe('validateForgotPassword', () => {
    const app = buildApp(validateForgotPassword);

    it('passes with a valid email', async () => {
      const res = await request(app).post('/test').send({ email: 'jordan@example.com' });
      expect(res.status).toBe(200);
    });

    it('rejects an invalid email', async () => {
      const res = await request(app).post('/test').send({ email: 'nope' });
      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
    });
  });

  describe('validateResetPassword', () => {
    const app = buildApp(validateResetPassword);

    it('passes with a password of at least 8 characters', async () => {
      const res = await request(app).post('/test').send({ password: 'longenough' });
      expect(res.status).toBe(200);
    });

    it('rejects a short password', async () => {
      const res = await request(app).post('/test').send({ password: 'short' });
      expect(res.status).toBe(422);
      expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
    });
  });
});

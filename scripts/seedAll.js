// scripts/seedAll.js
// ─────────────────────────────────────────────────────────────────
// Puebla TODAS las colecciones con datos de demo coherentes:
//   users → exercises → routines → sessions → progress
//
// Re-ejecutable: borra los datos de demo (rutinas/sesiones/progreso
// de los usuarios de demo) y los recrea. NO toca usuarios reales.
//
// Uso: npm run seed:all
// ─────────────────────────────────────────────────────────────────

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/user');
const Exercise = require('../models/exercises');
const Routine = require('../models/routines');
const Session = require('../models/sessions');
const Progress = require('../models/progress');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

// ─── Backup catalog (if the API does not respond) ──────────────
const FALLBACK_EXERCISES = [
  ['Barbell Bench Press', 'chest', 'barbell', 'pectorals', 'intermediate'],
  ['Incline Dumbbell Press', 'chest', 'dumbbell', 'pectorals', 'intermediate'],
  ['Push-up', 'chest', 'body weight', 'pectorals', 'beginner'],
  ['Pull-up', 'back', 'body weight', 'lats', 'intermediate'],
  ['Barbell Row', 'back', 'barbell', 'upper back', 'intermediate'],
  ['Lat Pulldown', 'back', 'cable', 'lats', 'beginner'],
  ['Deadlift', 'upper legs', 'barbell', 'glutes', 'advanced'],
  ['Barbell Squat', 'upper legs', 'barbell', 'quads', 'intermediate'],
  ['Leg Press', 'upper legs', 'machine', 'quads', 'beginner'],
  ['Walking Lunge', 'upper legs', 'dumbbell', 'quads', 'beginner'],
  ['Overhead Press', 'shoulders', 'barbell', 'delts', 'intermediate'],
  ['Lateral Raise', 'shoulders', 'dumbbell', 'delts', 'beginner'],
  ['Dumbbell Bicep Curl', 'upper arms', 'dumbbell', 'biceps', 'beginner'],
  ['Tricep Pushdown', 'upper arms', 'cable', 'triceps', 'beginner'],
  ['Plank', 'waist', 'body weight', 'abs', 'beginner'],
  ['Crunch', 'waist', 'body weight', 'abs', 'beginner'],
].map(([name, bodyPart, equipment, target, difficulty]) => ({
  name, bodyPart, equipment, target, difficulty, isPublic: true, createdBy: null,
  instructions: ['Keep a controlled technique through the full range of motion.'],
}));

// The free ExerciseDB plan returns 10 per request → paginate with offset.
async function tryFetchFromApi(target = 120, pageSize = 10) {
  if (!RAPIDAPI_KEY) return null;
  const headers = { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': RAPIDAPI_HOST };
  const all = [];
  try {
    for (let offset = 0; offset < target; offset += pageSize) {
      const res = await fetch(`https://${RAPIDAPI_HOST}/exercises?limit=${pageSize}&offset=${offset}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const page = await res.json();
      if (!Array.isArray(page) || !page.length) break; // end of catalog
      all.push(...page);
      if (page.length < pageSize) break;
      await new Promise((r) => setTimeout(r, 250)); // respetar rate limit
    }
    if (!all.length) return null;
    return all.map((r) => ({
      externalId: r.id,
      name: r.name,
      bodyPart: r.bodyPart?.toLowerCase(),
      equipment: r.equipment?.toLowerCase(),
      target: r.target?.toLowerCase(),
      secondaryMuscles: r.secondaryMuscles || [],
      instructions: r.instructions || [],
      gifUrl: r.gifUrl,
      difficulty: ['beginner', 'intermediate', 'advanced'].includes(r.difficulty) ? r.difficulty : 'intermediate',
      isPublic: true,
      createdBy: null,
    }));
  } catch (err) {
    if (all.length) {
      console.log(`ℹ️  ExerciseDB cortó en ${all.length} (${err.message}); usando lo descargado.`);
      return all.map((r) => ({
        externalId: r.id, name: r.name, bodyPart: r.bodyPart?.toLowerCase(),
        equipment: r.equipment?.toLowerCase(), target: r.target?.toLowerCase(),
        secondaryMuscles: r.secondaryMuscles || [], instructions: r.instructions || [],
        gifUrl: r.gifUrl, isPublic: true, createdBy: null,
      }));
    }
    console.log(`ℹ️  ExerciseDB no disponible (${err.message}); usando catálogo de respaldo.`);
    return null;
  }
}

// Reinserts the system catalog (createdBy:null) clean on each run.
// No toca ejercicios creados por usuarios.
async function ensureExercises() {
  const fromApi = await tryFetchFromApi(120);
  const source = fromApi || FALLBACK_EXERCISES;
  console.log(`📡 Catálogo: ${fromApi ? 'ExerciseDB' : 'respaldo local'} (${source.length} ejercicios)`);

  await Exercise.deleteMany({ createdBy: null });

  // The fallback set is always needed (routines reference exercises by name).
  // Avoid name collision with those from the API.
  const apiNames = new Set(source.map((e) => e.name.toLowerCase()));
  const fallbackNeeded = FALLBACK_EXERCISES.filter((e) => !apiNames.has(e.name.toLowerCase()));

  await Exercise.insertMany([...source, ...fallbackNeeded], { ordered: false });
  const total = await Exercise.countDocuments();
  console.log(`✅ Ejercicios en BD: ${total}`);
}

const DEMO_USERS = [
  { name: 'Jordan Larcher', email: 'jordan@tempo.app', password: 'password123', role: 'user' },
  { name: 'María López', email: 'maria@tempo.app', password: 'password123', role: 'coach' },
  { name: 'Alex Kim', email: 'alex@tempo.app', password: 'password123', role: 'user' },
];

async function ensureUsers() {
  const users = {};
  for (const u of DEMO_USERS) {
    let user = await User.findOne({ email: u.email });
    if (!user) user = await User.create(u); // the hook hashes the password
    users[u.email] = user;
  }
  console.log(`✅ Usuarios de demo: ${Object.keys(users).length} (password: password123)`);
  return users;
}

async function seed() {
  await connectDB();
  try {
    await ensureExercises();
    const users = await ensureUsers();

    // Map name(lowercase)→exercise to build routines (case-insensitive)
    const exDocs = await Exercise.find({});
    const byName = Object.fromEntries(exDocs.map((e) => [e.name.toLowerCase(), e]));
    const E = (name) => {
      const d = byName[name.toLowerCase()];
      if (!d) throw new Error(`Ejercicio faltante para rutina: ${name}`);
      return d._id;
    };

    // ─── Clean previous demo data ───────────────────────
    const demoIds = Object.values(users).map((u) => u._id);
    await Progress.deleteMany({ user: { $in: demoIds } });
    await Session.deleteMany({ user: { $in: demoIds } });
    await Routine.deleteMany({ owner: { $in: demoIds } });
    console.log('🧹 Datos de demo previos eliminados.');

    // ─── Routines ─────────────────────────────────────────────
    const jordan = users['jordan@tempo.app'];
    const maria = users['maria@tempo.app'];
    const alex = users['alex@tempo.app'];

    const mk = (exercise, sets, reps, restSeconds) => ({ exercise, sets, reps, restSeconds });

    const routinesData = [
      {
        name: 'Push Day', description: 'Chest, shoulders and triceps.', owner: jordan._id,
        isPublic: true, tags: ['fuerza', 'hipertrofia'],
        exercises: [
          mk(E('Barbell Bench Press'), 4, 8, 120),
          mk(E('Incline Dumbbell Press'), 3, 10, 90),
          mk(E('Overhead Press'), 3, 8, 90),
          mk(E('Lateral Raise'), 3, 15, 60),
          mk(E('Tricep Pushdown'), 3, 12, 60),
        ],
      },
      {
        name: 'Pull Day', description: 'Back and biceps.', owner: jordan._id,
        isPublic: true, tags: ['fuerza', 'hipertrofia'],
        exercises: [
          mk(E('Deadlift'), 4, 5, 180),
          mk(E('Pull-up'), 4, 8, 120),
          mk(E('Barbell Row'), 3, 10, 90),
          mk(E('Lat Pulldown'), 3, 12, 75),
          mk(E('Dumbbell Bicep Curl'), 3, 12, 60),
        ],
      },
      {
        name: 'Leg Day', description: 'Full legs.', owner: jordan._id,
        isPublic: true, tags: ['fuerza'],
        exercises: [
          mk(E('Barbell Squat'), 4, 8, 150),
          mk(E('Leg Press'), 3, 12, 90),
          mk(E('Walking Lunge'), 3, 10, 75),
          mk(E('Plank'), 3, 45, 45),
        ],
      },
      {
        name: 'Full Body Beginner', description: 'Starter full-body routine.', owner: maria._id,
        isPublic: true, tags: ['full-body', 'principiante'],
        exercises: [
          mk(E('Push-up'), 3, 12, 60),
          mk(E('Lat Pulldown'), 3, 12, 60),
          mk(E('Leg Press'), 3, 12, 60),
          mk(E('Crunch'), 3, 15, 45),
        ],
      },
      {
        name: 'My private routine', description: 'Personal draft.', owner: alex._id,
        isPublic: false, tags: [],
        exercises: [
          mk(E('Barbell Bench Press'), 5, 5, 120),
          mk(E('Barbell Squat'), 5, 5, 150),
        ],
      },
    ];

    const routines = await Routine.create(routinesData);
    console.log(`✅ Rutinas: ${routines.length}`);

    // ─── Jordan's sessions + progress (last 8 weeks) ───
    const jordanRoutines = routines.filter((r) => r.owner.equals(jordan._id));
    const feelings = ['great', 'good', 'average', 'tired', 'good'];
    let sessionCount = 0, progressCount = 0;
    let lastDate = null;

    for (let w = 7; w >= 0; w--) {
      const routine = jordanRoutines[w % jordanRoutines.length];
      const date = new Date();
      date.setDate(date.getDate() - w * 7 - (w % 2)); // ~1 session/week
      date.setHours(18, 0, 0, 0);
      lastDate = date;

      const session = await Session.create({
        user: jordan._id,
        routine: routine._id,
        date,
        durationMinutes: 45 + (w % 3) * 10,
        feeling: feelings[w % feelings.length],
        notes: w === 0 ? 'Good session, added weight.' : '',
      });
      sessionCount++;

      // Progreso para los 2 primeros ejercicios de la rutina; peso sube con las semanas
      const weeksAgo = 7 - w; // 0 (oldest) → 7 (most recent)
      for (const rx of routine.exercises.slice(0, 2)) {
        const baseWeight = 40 + weeksAgo * 2.5;
        await Progress.create({
          session: session._id,
          user: jordan._id,
          exercise: rx.exercise,
          recordedAt: date,
          sets: Array.from({ length: rx.sets }, (_, i) => ({
            setNumber: i + 1,
            reps: rx.reps,
            weightKg: Math.round((baseWeight + i * 2.5) * 2) / 2,
            completed: true,
          })),
        });
        progressCount++;
      }
    }

    // Update Jordan's streak
    await User.findByIdAndUpdate(jordan._id, { streak: 5, lastWorkoutDate: lastDate });

    console.log(`✅ Sesiones: ${sessionCount}`);
    console.log(`✅ Entradas de progreso: ${progressCount}`);
    console.log('\n🎉 Seed completo. Inicia sesión con jordan@tempo.app / password123');
  } catch (err) {
    console.error('❌ Seed falló:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
  }
}

seed();

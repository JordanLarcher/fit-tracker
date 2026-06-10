// scripts/seedExercises.js
// ─────────────────────────────────────────────────────────────────
// Script de un solo uso para poblar la colección de exercises
// con datos de ExerciseDB (vía RapidAPI).
//
// Uso: npm run seed
//
// ESTRATEGIA:
//   1. Fetch a ExerciseDB con limit alto (ej: 100 ejercicios)
//   2. Mapear el shape de ExerciseDB al schema de nuestro modelo
//   3. Usar insertMany con ordered:false para saltar duplicados
//      (por si el script se corre más de una vez)
// ─────────────────────────────────────────────────────────────────

require('dotenv').config();
const mongoose = require('mongoose');
const Exercise = require('../models/exercises');
const connectDB = require('../config/db');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

async function fetchExercises(limit = 100) {
  const url = `https://${RAPIDAPI_HOST}/exercises?limit=${limit}&offset=0`;
  const response = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  });

  if (!response.ok) {
    throw new Error(`ExerciseDB API error: ${response.status}`);
  }

  return response.json();
}

function mapExercise(raw) {
  return {
    externalId: raw.id,
    name: raw.name,
    bodyPart: raw.bodyPart?.toLowerCase(),
    equipment: raw.equipment?.toLowerCase(),
    target: raw.target?.toLowerCase(),
    secondaryMuscles: raw.secondaryMuscles || [],
    instructions: raw.instructions || [],
    gifUrl: raw.gifUrl,
    isPublic: true,
    createdBy: null,
  };
}

async function seed() {
  await connectDB();

  try {
    console.log('📡 Fetching exercises from ExerciseDB...');
    const rawExercises = await fetchExercises(100);
    console.log(`✅ Fetched ${rawExercises.length} exercises`);

    const mapped = rawExercises.map(mapExercise);

    // insertMany con ordered:false continúa aunque haya duplicados (por externalId único)
    const result = await Exercise.insertMany(mapped, { ordered: false });
    console.log(`✅ Inserted ${result.length} exercises into MongoDB`);

  } catch (err) {
    if (err.code === 11000) {
      console.log('ℹ️  Some exercises already existed (skipped duplicates).');
    } else {
      console.error('❌ Seed failed:', err.message);
    }
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

seed();
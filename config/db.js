const dns = require('dns');
const mongoose = require('mongoose');

const connectDB = async () => {
  const dbUri = process.env.MONGO_URL || process.env.MONGODB_URI;

  if (!dbUri) {
    console.error('Database connection string (MONGO_URL or MONGODB_URI) is missing in environment variables.');
    process.exit(1);
  }

  // Use Google DNS to workaround SRV resolution issues on some Windows networks
  dns.setServers(['8.8.8.8', '8.8.4.4']);

  try {
    const conn = await mongoose.connect(dbUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;

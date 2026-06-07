const mongoose = require('mongoose');

let _db;

const initDb = (callback) => {
    if (_db) {
        console.log('DB is already initialized!');
        return callback(null, _db);
    }

    const dbUri = process.env.MONGO_URL || process.env.MONGODB_URI;

    if (!dbUri) {
        return callback(new Error('Database connection string (MONGO_URL or MONGODB_URI) is missing in environment variables.'));
    }

    mongoose.connect(dbUri)
        .then((db) => {
            _db = db;
            callback(null, _db);
        })
        .catch((err) => {
            callback(err);
        });
};

const getDb = () => {
    if (!_db) throw Error('DB not Initialized!');
    return _db;
};

module.exports = { initDb, getDb };
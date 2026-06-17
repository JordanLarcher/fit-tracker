// utils/token.js — JWT helpers

const jwt = require('jsonwebtoken');


const signToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verify and decode a JWT.
 * Throws JsonWebTokenError o TokenExpiredError si no es válido.
 * @param {string} token
 * @returns {Object} decoded payload
 */
const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { signToken, verifyToken };
// config/swagger.js
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');

const swaggerOptions = {
  customCss: '.swagger-ui .topbar { background-color: #0F3460; }',
  customSiteTitle: 'FitTrack API Docs',
};

module.exports = { swaggerUi, swaggerDocument, swaggerOptions };
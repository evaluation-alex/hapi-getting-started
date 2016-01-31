'use strict';
const buildRESTRoutes = require('./../common/routes').buildRESTRoutes;
const Controller = require('./controller');
module.exports = buildRESTRoutes('audit', Controller);

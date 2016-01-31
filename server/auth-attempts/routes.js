'use strict';
const buildRESTRoutes = require('./../common/routes').buildRESTRoutes;
const Controller = require('./controller');
module.exports = buildRESTRoutes('auth-attempts', Controller);

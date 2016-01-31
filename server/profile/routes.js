'use strict';
const buildRESTRoutes = require('./../common/routes').buildRESTRoutes;
const Controller = require('./controller');
module.exports = buildRESTRoutes('profile', Controller);

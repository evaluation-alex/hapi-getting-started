'use strict';
const {buildRESTRoutes} = require('./../../common/routes');
const Controller = require('./controller');
const routes = buildRESTRoutes('preferences', Controller);
module.exports = routes;

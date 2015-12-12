'use strict';
const {buildRESTRoutes} = require('./../../common/routes');
const Controller = require('./controller');
const routes = buildRESTRoutes('profile', Controller);
module.exports = routes;

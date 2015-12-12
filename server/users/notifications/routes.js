'use strict';
const {buildRESTRoutes} = require('./../../common/routes');
const Controller = require('./controller');
const routes = buildRESTRoutes('notifications', Controller);
module.exports = routes;

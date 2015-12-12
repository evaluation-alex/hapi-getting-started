'use strict';
const {buildRESTRoutes} = require('./../../../common/routes');
const Controller = require('./controller');
const routes = buildRESTRoutes('auth-attempts', Controller);
module.exports = routes;

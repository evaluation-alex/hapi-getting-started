'use strict';
const {buildRESTRoutes} = require('./../common/routes');
const Controller = require('./controller');
const routes = buildRESTRoutes('audit', Controller);
module.exports = routes;

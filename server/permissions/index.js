'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');

module.exports = RouteFactory.discoverDefaultRoutes('permissions', Controller);
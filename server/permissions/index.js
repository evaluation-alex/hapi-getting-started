'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');

module.exports = (new RouteFactory()).discoverDefaultRoutes('permissions', Controller).doneConfiguring();

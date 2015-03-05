'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');

module.exports = (new RouteFactory()).discoverDefaultRoutes('auth-attempts', Controller).doneConfiguring();

'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = RouteFactory.discoverDefaultRoutes('permissions', Controller);
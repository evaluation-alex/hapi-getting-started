'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');

var routeFactory = new RouteFactory();

routeFactory.discoverDefaultRoutes('blogs', Controller).joinApproveRejectLeaveRoutes('blogs', Controller);

module.exports = routeFactory.doneConfiguring();

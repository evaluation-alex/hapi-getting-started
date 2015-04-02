'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');
var routeFactory = new RouteFactory();
routeFactory.discoverDefaultRoutes('user-groups', Controller).joinApproveRejectLeaveRoutes('user-groups', Controller);
module.exports = routeFactory.doneConfiguring();

'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');
module.exports = (new RouteFactory())
    .discoverDefaultRoutes('blogs', Controller)
    .joinApproveRejectLeaveRoutes('blogs', Controller)
    .doneConfiguring();

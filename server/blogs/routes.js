'use strict';
let RouteFactory = require('./../common/route-factory');
let Controller = require('./controller');
module.exports = (new RouteFactory())
    .discoverDefaultRoutes('blogs', Controller)
    .joinApproveRejectLeaveRoutes('blogs', Controller)
    .doneConfiguring();

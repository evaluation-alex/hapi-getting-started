'use strict';
let RouteFactory = require('./../common/route-factory');
let Controller = require('./controller');
module.exports = (new RouteFactory())
    .discoverDefaultRoutes('user-groups', Controller)
    .joinApproveRejectLeaveRoutes('user-groups', Controller)
    .doneConfiguring();

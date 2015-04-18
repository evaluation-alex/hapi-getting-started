'use strict';
let RouteFactory = require('./../../common/route-factory');
let Controller = require('./controller');
module.exports = (new RouteFactory()).discoverDefaultRoutes('profile', Controller).doneConfiguring();

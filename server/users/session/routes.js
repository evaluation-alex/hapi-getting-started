'use strict';
let RouteFactory = require('./../../common/route-factory');
let Controller = require('./controller');
let routeFactory = new RouteFactory();
routeFactory.newRoute()
    .forMethod('POST')
    .onPath('/session')
    .withController(Controller.login);
routeFactory.newRoute()
    .forMethod('DELETE')
    .onPath('/session')
    .usingAuthStrategy('simple')
    .withController(Controller.logout);
module.exports = routeFactory.doneConfiguring();

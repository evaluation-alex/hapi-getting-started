'use strict';
var RouteFactory = require('./../../common/route-factory');
var Controller = require('./controller');

var routeFactory = new RouteFactory();

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

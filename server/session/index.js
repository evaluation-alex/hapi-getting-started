'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');

var routeFactory = new RouteFactory();

routeFactory.newRoute()
    .forMethod('POST')
    .onPath('/login')
    .withController(Controller.login);
routeFactory.newRoute()
    .forMethod('DELETE')
    .onPath('/logout')
    .usingAuthStrategy('simple')
    .withController(Controller.logout);

module.exports = routeFactory.doneConfiguring();

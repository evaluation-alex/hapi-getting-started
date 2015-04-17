'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');
var routeFactory = new RouteFactory();
routeFactory.discoverDefaultRoutes('users', Controller);
routeFactory.newRoute()
    .forMethod('POST')
    .onPath('/signup')
    .withController(Controller.signup);
routeFactory.newRoute()
    .forMethod('POST')
    .onPath('/login/forgot')
    .withController(Controller.loginForgot);
routeFactory.newRoute()
    .forMethod('POST')
    .onPath('/login/reset')
    .withController(Controller.loginReset);
module.exports = routeFactory.doneConfiguring();

'use strict';
let RouteFactory = require('./../common/route-factory');
let Controller = require('./controller');
let routeFactory = new RouteFactory();
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

'use strict';
let RouteFactory = require('./../common/route-factory');
let Controller = require('./controller');
module.exports = (new RouteFactory()).discoverDefaultRoutes('users', Controller)
    .newRoute()
    .forMethod('POST')
    .onPath('/signup')
    .withController(Controller.signup)
    .newRoute()
    .forMethod('POST')
    .onPath('/login/forgot')
    .withController(Controller.loginForgot)
    .newRoute()
    .forMethod('POST')
    .onPath('/login/reset')
    .withController(Controller.loginReset)
    .doneConfiguring();

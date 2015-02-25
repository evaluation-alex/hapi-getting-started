'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');

module.exports = [
    RouteFactory.defaultFindRoute('users', Controller.find),
    RouteFactory.defaultFindOneRoute('users', Controller.findOne),
    RouteFactory.defaultUpdateRoute('users', Controller.update),
    RouteFactory.newRoute()
        .forMethod('POST')
        .onPath('/signup')
        .withController(Controller.signup)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forMethod('POST')
        .onPath('/login/forgot')
        .withController(Controller.loginForgot)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forMethod('POST')
        .onPath('/login/reset')
        .withController(Controller.loginReset)
        .doneConfiguring()
];

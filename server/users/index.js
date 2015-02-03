'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.defaultFindRoute('users', Controller.find),
    RouteFactory.defaultFindOneRoute('users', Controller.findOne),
    RouteFactory.defaultUpdateRoute('users', Controller.update),
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/signup')
        .withController(Controller.signup)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/login/forgot')
        .withController(Controller.loginForgot)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/login/reset')
        .withController(Controller.loginReset)
        .doneConfiguring()
];

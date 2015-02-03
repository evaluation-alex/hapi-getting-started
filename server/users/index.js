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
        .withValidation(Controller.signup.validator)
        .preProcessWith(Controller.signup.pre)
        .handleUsing(Controller.signup.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/login/forgot')
        .withValidation(Controller.loginForgot.validator)
        .preProcessWith(Controller.loginForgot.pre)
        .handleUsing(Controller.loginForgot.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/login/reset')
        .withValidation(Controller.loginReset.validator)
        .preProcessWith(Controller.loginReset.pre)
        .handleUsing(Controller.loginReset.handler)
        .doneConfiguring()
];

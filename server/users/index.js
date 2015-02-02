'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forGET()
        .onPath('/users')
        .usingAuthStrategy('simple')
        .withValidation(Controller.find.validator)
        .preProcessWith(Controller.find.pre)
        .handleUsing(Controller.find.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forGET()
        .onPath('/users/{id}')
        .usingAuthStrategy('simple')
        .preProcessWith(Controller.findOne.pre)
        .handleUsing(Controller.findOne.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forPUT()
        .onPath('/users/{id}')
        .usingAuthStrategy('simple')
        .withValidation(Controller.update.validator)
        .preProcessWith(Controller.update.pre)
        .handleUsing(Controller.update.handler)
        .doneConfiguring(),
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

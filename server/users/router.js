'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forGET()
        .onPath('/users')
        .usingAuthStrategy('simple')
        .withValidation(Controller.find.validator)
        .ensureRolePermissions('view', 'users')
        .handleUsing(Controller.find.handler)
        .doneConfiguring()
        .describeRoute(),
    RouteFactory.newRoute()
        .forGET()
        .onPath('/users/{id}')
        .usingAuthStrategy('simple')
        .ensureRolePermissions('view', 'users')
        .handleUsing(Controller.findOne.handler)
        .doneConfiguring()
        .describeRoute(),
    RouteFactory.newRoute()
        .forPUT()
        .onPath('/users/{id}')
        .usingAuthStrategy('simple')
        .withValidation(Controller.update.validator)
        .ensureRolePermissions('update', 'users')
        .handleUsing(Controller.update.handler)
        .doneConfiguring()
        .describeRoute(),
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/signup')
        .withValidation(Controller.signup.validator)
        .preProcessWith(Controller.signup.pre)
        .handleUsing(Controller.signup.handler)
        .doneConfiguring()
        .describeRoute(),
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/login/forgot')
        .withValidation(Controller.loginForgot.validator)
        .preProcessWith(Controller.loginForgot.pre)
        .handleUsing(Controller.loginForgot.handler)
        .doneConfiguring()
        .describeRoute(),
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/login/reset')
        .withValidation(Controller.loginReset.validator)
        .preProcessWith(Controller.loginReset.pre)
        .handleUsing(Controller.loginReset.handler)
        .doneConfiguring()
        .describeRoute()
];

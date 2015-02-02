'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/login')
        .withValidation(Controller.login.validator)
        .preProcessWith(Controller.login.pre)
        .handleUsing(Controller.login.handler)
        .doneConfiguring()
        .describeRoute(),
    RouteFactory.newRoute()
        .forDELETE()
        .onPath('/logout')
        .usingAuthStrategy('simple')
        .handleUsing(Controller.logout.handler)
        .doneConfiguring()
        .describeRoute()
];

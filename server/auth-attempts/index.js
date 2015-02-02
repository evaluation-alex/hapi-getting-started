'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forGET()
        .onPath('/auth-attempts')
        .usingAuthStrategy('simple')
        .withValidation(Controller.find.validator)
        .preProcessWith(Controller.find.pre)
        .handleUsing(Controller.find.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forDELETE()
        .onPath('/auth-attempts/{id}')
        .usingAuthStrategy('simple')
        .preProcessWith(Controller.delete.pre)
        .handleUsing(Controller.delete.handler)
        .doneConfiguring()
];

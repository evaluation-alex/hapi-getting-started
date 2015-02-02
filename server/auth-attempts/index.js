'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forGET()
        .onPath('/auth-attempts')
        .usingAuthStrategy('simple')
        .withValidation(Controller.find.validator)
        .ensureRolePermissions('view', 'auth-attempts')
        .handleUsing(Controller.find.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forDELETE()
        .onPath('/auth-attempts/{id}')
        .usingAuthStrategy('simple')
        .ensureRolePermissions('update', 'auth-attempts')
        .handleUsing(Controller.delete.handler)
        .doneConfiguring()
];

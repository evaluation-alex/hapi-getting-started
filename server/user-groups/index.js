'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forGET()
        .onPath('/user-groups')
        .usingAuthStrategy('simple')
        .withValidation(Controller.find.validator)
        .ensureRolePermissions('view', 'user-groups')
        .handleUsing(Controller.find.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forGET()
        .onPath('/user-groups/{id}')
        .usingAuthStrategy('simple')
        .ensureRolePermissions('view', 'user-groups')
        .handleUsing(Controller.findOne.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forPUT()
        .onPath('/user-groups/{id}')
        .usingAuthStrategy('simple')
        .withValidation(Controller.update.validator)
        .ensureRolePermissions('update', 'user-groups')
        .preProcessWith(Controller.update.pre)
        .handleUsing(Controller.update.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/user-groups')
        .usingAuthStrategy('simple')
        .withValidation(Controller.new.validator)
        .ensureRolePermissions('update', 'user-groups')
        .preProcessWith(Controller.new.pre)
        .handleUsing(Controller.new.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forDELETE()
        .onPath('/user-groups/{id}')
        .usingAuthStrategy('simple')
        .ensureRolePermissions('update', 'user-groups')
        .preProcessWith(Controller.delete.pre)
        .handleUsing(Controller.delete.handler)
        .doneConfiguring()
];
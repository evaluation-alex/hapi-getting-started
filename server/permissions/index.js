'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forGET()
        .onPath('/permissions')
        .usingAuthStrategy('simple')
        .withValidation(Controller.find.validator)
        .ensureRolePermissions('view', 'permissions')
        .handleUsing(Controller.find.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forGET()
        .onPath('/permissions/{id}')
        .usingAuthStrategy('simple')
        .ensureRolePermissions('view', 'permissions')
        .handleUsing(Controller.findOne.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forPUT()
        .onPath('/permissions/{id}')
        .usingAuthStrategy('simple')
        .withValidation(Controller.update.validator)
        .ensureRolePermissions('update', 'permissions')
        .preProcessWith(Controller.update.pre)
        .handleUsing(Controller.update.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/permissions')
        .usingAuthStrategy('simple')
        .withValidation(Controller.new.validator)
        .ensureRolePermissions('update', 'permissions')
        .preProcessWith(Controller.new.pre)
        .handleUsing(Controller.new.handler)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forDELETE()
        .onPath('/permissions/{id}')
        .usingAuthStrategy('simple')
        .ensureRolePermissions('update', 'permissions')
        .preProcessWith(Controller.delete.pre)
        .handleUsing(Controller.delete.handler)
        .doneConfiguring()
];
'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

var routes = RouteFactory.discoverDefaultRoutes('user-groups', Controller);
routes.push(RouteFactory.newRoute()
    .forMethod('PUT')
    .onPath('/user-groups/{id}/join')
    .usingAuthStrategy('simple')
    .withController(Controller.join)
    .doneConfiguring());
routes.push(RouteFactory.newRoute()
    .forMethod('PUT')
    .onPath('/user-groups/{id}/approve')
    .usingAuthStrategy('simple')
    .withController(Controller.approve)
    .doneConfiguring());
routes.push(RouteFactory.newRoute()
    .forMethod('PUT')
    .onPath('/user-groups/{id}/reject')
    .usingAuthStrategy('simple')
    .withController(Controller.reject)
    .doneConfiguring());

module.exports.Routes = routes;

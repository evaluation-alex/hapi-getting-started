'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forMethod('POST')
        .onPath('/login')
        .withController(Controller.login)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forMethod('DELETE')
        .onPath('/logout')
        .usingAuthStrategy('simple')
        .withController(Controller.logout)
        .doneConfiguring()
];

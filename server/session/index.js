'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/login')
        .withController(Controller.login)
        .doneConfiguring(),
    RouteFactory.newRoute()
        .forDELETE()
        .onPath('/logout')
        .usingAuthStrategy('simple')
        .withController(Controller.logout)
        .doneConfiguring()
];

'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/contact')
        .withController(Controller.contact)
        .doneConfiguring()
];

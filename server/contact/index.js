'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forPOST()
        .onPath('/contact')
        .withValidation(Controller.contact.validator)
        .handleUsing(Controller.signup.handler)
        .doneConfiguring()
        .describeRoute()
];

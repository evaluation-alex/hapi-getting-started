'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;

module.exports.Routes = [
    RouteFactory.newRoute()
        .forGET()
        .onPath('/audit')
        .usingAuthStrategy('simple')
        .withValidation(Controller.find.validator)
        .preProcessWith(Controller.find.pre)
        .handleUsing(Controller.find.handler)
        .doneConfiguring()
];

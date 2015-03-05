'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');
var _ = require('lodash');

var routeFactory = new RouteFactory();

routeFactory.discoverDefaultRoutes('user-groups', Controller);
_.forEach(['join', 'approve', 'reject'], function (action) {
    routeFactory.newRoute()
        .forMethod('PUT')
        .onPath('/user-groups/{id}/' + action)
        .usingAuthStrategy('simple')
        .withController(Controller[action]);
});

module.exports = routeFactory.doneConfiguring();

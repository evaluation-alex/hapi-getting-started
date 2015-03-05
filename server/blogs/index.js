'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');
var _ = require('lodash');

var routeFactory = new RouteFactory();

routeFactory.discoverDefaultRoutes('blogs', Controller);
_.forEach(['subscribe', 'approve', 'reject'], function (action) {
    routeFactory.newRoute()
        .forMethod('PUT')
        .onPath('/blogs/{id}/' + action)
        .usingAuthStrategy('simple')
        .withController(Controller[action]);
});

module.exports = routeFactory.doneConfiguring();

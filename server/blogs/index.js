'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller').Controller;
var _ = require('lodash');

var routes = RouteFactory.discoverDefaultRoutes('blogs', Controller);
_.forEach(['subscribe', 'approve', 'reject'], function (action) {
    routes.push(RouteFactory.newRoute()
        .forMethod('PUT')
        .onPath('/blogs/{id}/' + action)
        .usingAuthStrategy('simple')
        .withController(Controller[action])
        .doneConfiguring());
});

module.exports.Routes = routes;

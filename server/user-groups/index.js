'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');
var _ = require('lodash');

var routes = RouteFactory.discoverDefaultRoutes('user-groups', Controller);
_.forEach(['join', 'approve', 'reject'], function (action) {
    routes.push(RouteFactory.newRoute()
        .forMethod('PUT')
        .onPath('/user-groups/{id}/' + action)
        .usingAuthStrategy('simple')
        .withController(Controller[action])
        .doneConfiguring());
});

module.exports = routes;

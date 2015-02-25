'use strict';
var RouteFactory = require('./../../common/route-factory');
var Controller = require('./controller');
var _ = require('lodash');

var routes = RouteFactory.discoverDefaultRoutes('posts', Controller, '/blogs/{blogId}');
_.forEach(['approve', 'reject'], function (action) {
    routes.push(RouteFactory.newRoute()
        .forMethod('PUT')
        .onPath('/blogs/{blogId}/posts/{id}/' + action)
        .usingAuthStrategy('simple')
        .withController(Controller[action])
        .doneConfiguring());
});

module.exports = routes;

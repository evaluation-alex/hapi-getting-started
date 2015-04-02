'use strict';
var RouteFactory = require('./../../common/route-factory');
var Controller = require('./controller');
var _ = require('lodash');
var routeFactory = new RouteFactory();
routeFactory.discoverDefaultRoutes('posts', Controller, '/blogs/{blogId}');
routeFactory.discoverDefaultRoutes('posts', Controller);
_.forEach(['publish', 'reject'], function (action) {
    routeFactory.newRoute()
        .forMethod('PUT')
        .onPath('/blogs/{blogId}/posts/{id}/' + action)
        .usingAuthStrategy('simple')
        .withController(Controller[action]);
    routeFactory.newRoute()
        .forMethod('PUT')
        .onPath('/posts/{id}/' + action)
        .usingAuthStrategy('simple')
        .withController(Controller[action]);
});
module.exports = routeFactory.doneConfiguring();

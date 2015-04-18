'use strict';
let RouteFactory = require('./../../common/route-factory');
let Controller = require('./controller');
let _ = require('lodash');
let routeFactory = new RouteFactory();
routeFactory.discoverDefaultRoutes('posts', Controller, '/blogs/{blogId}');
routeFactory.discoverDefaultRoutes('posts', Controller);
_.forEach(['publish', 'reject'], (action) => {
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

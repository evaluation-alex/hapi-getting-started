'use strict';
const {buildRESTRoutes, buildRoutesForMethods} = require('./../common/routes');
const Controller = require('./controller');
module.exports = [
    buildRESTRoutes('posts', Controller, '/blogs/{blogId}'),
    buildRESTRoutes('posts', Controller),
    buildRoutesForMethods(['publish', 'reject'], 'posts', Controller, '/blogs/{blogId}'),
    buildRoutesForMethods(['publish', 'reject'], 'posts', Controller)
];

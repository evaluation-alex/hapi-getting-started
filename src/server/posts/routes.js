'use strict';
const routes = require('./../common/routes');
const {buildRESTRoutes, buildRoutesForMethods} = routes;
const Controller = require('./controller');
module.exports = [
    buildRESTRoutes('posts', Controller),
    buildRoutesForMethods(['publish', 'reject'], 'posts', Controller)
];

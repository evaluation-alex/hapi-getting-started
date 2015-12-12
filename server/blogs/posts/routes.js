'use strict';
const {flattenDeep} = require('lodash');
const {buildRESTRoutes, buildRoutesForMethods} = require('./../../common/routes');
const Controller = require('./controller');
const routes = flattenDeep([
    buildRESTRoutes('posts', Controller, '/blogs/{blogId}'),
    buildRESTRoutes('posts', Controller),
    buildRoutesForMethods(['publish', 'reject'], 'posts', Controller, '/blogs/{blogId}'),
    buildRoutesForMethods(['publish', 'reject'], 'posts', Controller)
]);
module.exports = routes;

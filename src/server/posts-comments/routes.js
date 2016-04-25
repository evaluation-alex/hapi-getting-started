'use strict';
const routes = require('./../common/routes');
const {buildRESTRoutes, buildRoutesForMethods} = routes;
const Controller = require('./controller');
module.exports = [
    buildRESTRoutes('posts-comments', Controller),
    buildRoutesForMethods(['approve', 'spam'], 'posts-comments', Controller)
];

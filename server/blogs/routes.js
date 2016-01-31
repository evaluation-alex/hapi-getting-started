'use strict';
const routes = require('./../common/routes');
const {buildRESTRoutes, buildRoutesForMethods} = routes;
const Controller = require('./controller');
module.exports = [
    buildRESTRoutes('blogs', Controller),
    buildRoutesForMethods(['join', 'approve', 'reject', 'leave'], 'blogs', Controller)
];

'use strict';
const routes = require('./../common/routes');
const {buildRESTRoutes, buildRoutesForMethods} = routes;
const Controller = require('./controller');
module.exports = [
    buildRESTRoutes('user-groups', Controller),
    buildRoutesForMethods(['join', 'approve', 'reject', 'leave'], 'user-groups', Controller)
];

'use strict';
const {flatten} = require('lodash');
const {buildRESTRoutes, buildRoutesForMethods} = require('./../common/routes');
const Controller = require('./controller');
const routes = flatten([
    buildRESTRoutes('user-groups', Controller),
    buildRoutesForMethods(['join', 'approve', 'reject', 'leave'], 'user-groups', Controller)
]);
module.exports = routes;

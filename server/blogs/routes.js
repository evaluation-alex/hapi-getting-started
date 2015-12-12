'use strict';
const {flatten} = require('lodash');
const {buildRESTRoutes, buildRoutesForMethods} = require('./../common/routes');
const Controller = require('./controller');
const routes = flatten([
    buildRESTRoutes('blogs', Controller),
    buildRoutesForMethods(['join', 'approve', 'reject', 'leave'], 'blogs', Controller)
]);
module.exports = routes;

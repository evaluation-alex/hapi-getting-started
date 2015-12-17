'use strict';
const {buildRESTRoutes, buildRoutesForMethods} = require('./../common/routes');
const Controller = require('./controller');
module.exports = [
    ...buildRESTRoutes('blogs', Controller),
    ...buildRoutesForMethods(['join', 'approve', 'reject', 'leave'], 'blogs', Controller)
];

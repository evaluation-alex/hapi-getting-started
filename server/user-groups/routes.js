'use strict';
const {buildRESTRoutes, buildRoutesForMethods} = require('./../common/routes');
const Controller = require('./controller');
module.exports = [
    ...buildRESTRoutes('user-groups', Controller),
    ...buildRoutesForMethods(['join', 'approve', 'reject', 'leave'], 'user-groups', Controller)
];

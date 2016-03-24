'use strict';
const routes = require('./../common/routes')
const {buildRoutesForMethods} = routes;
const Controller = require('./controller');
module.exports = [
    buildRoutesForMethods(['incrementView', 'rate'], 'posts-stats', Controller, 'POST')
];

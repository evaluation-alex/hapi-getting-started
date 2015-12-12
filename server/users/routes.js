'use strict';
const {flatten} = require('lodash');
const {buildRESTRoutes, buildRoute} = require('./../common/routes');
const Controller = require('./controller');
const routes = flatten([
    buildRESTRoutes('users', Controller),
    buildRoute('POST', '/users/signup', Controller.signup, false),
    buildRoute('PUT', '/users/forgot', Controller.forgot, false),
    buildRoute('PUT', '/users/reset', Controller.reset, false)
]);
module.exports = routes;

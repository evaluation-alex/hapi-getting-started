'use strict';
const routes = require('./../common/routes');
const {buildRESTRoutes, buildRoute} = routes;
const Controller = require('./controller');
module.exports = [
    buildRESTRoutes('users', Controller),
    buildRoute('POST', '/users/signup', Controller.signup, false),
    buildRoute('PUT', '/users/forgot', Controller.forgot, false),
    buildRoute('PUT', '/users/reset', Controller.reset, false)
];

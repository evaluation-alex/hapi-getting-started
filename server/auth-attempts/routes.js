'use strict';
const {buildRESTRoutes} = require('./../common/routes');
const Controller = require('./controller');
module.exports = buildRESTRoutes('auth-attempts', Controller);

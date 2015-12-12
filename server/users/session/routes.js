'use strict';
const {buildRoute} = require('./../../common/routes');
const Controller = require('./controller');
const routes = [
    buildRoute('POST', '/session', Controller.login, false),
    buildRoute('DELETE', '/session', Controller.logout)
];
module.exports = routes;

'use strict';
const {buildRoute} = require('./../common/routes');
const Controller = require('./controller');
module.exports = [
    buildRoute('POST', '/session', Controller.login, false),
    buildRoute('DELETE', '/session', Controller.logout)
];

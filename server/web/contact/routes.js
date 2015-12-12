'use strict';
const {buildRoute} = require('./../../common/routes');
const Controller = require('./controller');
const routes = [
    buildRoute('POST', '/contact', Controller.contact, false)
];
module.exports = routes;

'use strict';
const buildRoute = require('./../../common/routes').buildRoute;
const Controller = require('./controller');
module.exports = [
    buildRoute('POST', '/contact', Controller.contact, false)
];

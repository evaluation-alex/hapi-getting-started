'use strict';
const {buildRoute} = require('./../../common/routes');
const Controller = require('./controller');
module.exports = [
    buildRoute('POST', '/contact', Controller.contact, false)
];

'use strict';
let schemas = require('./schemas');
let AuthAttempts = require('./model');
let ControllerFactory = require('./../../../common/controller-factory');
let utils = require('./../../../common/utils');
var Controller = new ControllerFactory(AuthAttempts)
    .findController(schemas.find, (request) => {
        let query = utils.buildQueryForPartialMatch({}, request, [['ip', 'ip'], ['email', 'email']]);
        query.organisation = '*';
        return query;
    })
    .doneConfiguring();
module.exports = Controller;

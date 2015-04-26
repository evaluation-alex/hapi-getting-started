'use strict';
let schemas = require('./schemas');
let Audit = require('./model');
let ControllerFactory = require('./../common/controller-factory');
let utils = require('./../common/utils');
var Controller = new ControllerFactory(Audit)
    .findController(schemas.find, (request) => {
        let query = utils.buildQueryForPartialMatch({}, request, [['by', 'by']]);
        query = utils.buildQueryForDateRange(query, request, 'on');
        query = utils.buildQueryForExactMatch(query, request, [['objectType','objectChangedType'], ['objectChangedId','objectChangedId']]);
        return query;
    })
    .doneConfiguring();
module.exports = Controller;
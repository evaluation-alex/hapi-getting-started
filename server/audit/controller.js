'use strict';
let Joi = require('joi');
let Audit = require('./model');
let ControllerFactory = require('./../common/controller-factory');
let utils = require('./../common/utils');
var Controller = new ControllerFactory(Audit)
    .findController({
        query: {
            by: Joi.string(),
            objectType: Joi.string(),
            objectChangedId: Joi.string(),
            onBefore: Joi.date().format('YYYY-MM-DD'),
            onAfter: Joi.date().format('YYYY-MM-DD')
        }
    }, (request) => {
        let query = utils.buildQueryForPartialMatch({}, request, [['by', 'by']]);
        query = utils.buildQueryForDateRange(query, request, 'on');
        query = utils.buildQueryForExactMatch(query, request, [['objectType','objectChangedType'], ['objectChangedId','objectChangedId']]);
        return query;
    })
    .doneConfiguring();
module.exports = Controller;
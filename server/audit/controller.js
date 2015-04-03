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
            onBefore: Joi.date(),
            onAfter: Joi.date()
        }
    }, (request) => {
        let query = utils.buildQueryFromRequestForDateFields(
            utils.buildQueryFromRequestForFields({}, request, [['by', 'by']]),
            request, 'on');
        if (request.query.objectType) {
            query.objectChangedType = request.query.objectType;
        }
        if (request.query.objectChangedId) {
            query.objectChangedId = request.query.objectChangedId;
        }
        return query;
    })
    .doneConfiguring();
module.exports = Controller;
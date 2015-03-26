'use strict';
var Joi = require('joi');
var Audit = require('./model');
var ControllerFactory = require('./../common/controller-factory');
var utils = require('./../common/utils');

var Controller = new ControllerFactory(Audit)
    .findController({
        query: {
            by: Joi.string(),
            objectType: Joi.string(),
            objectChangedId: Joi.string(),
            onBefore: Joi.date(),
            onAfter: Joi.date()
        }
    }, function buildFindQuery (request) {
        var query = {};
        utils.buildQueryFromRequestForFields(query, request, [['by', 'by']]);
        utils.buildQueryFromRequestForDateFields(query, request, 'on');
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
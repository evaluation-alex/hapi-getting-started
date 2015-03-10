'use strict';
var Joi = require('joi');
var Audit = require('./model');
var ControllerFactory = require('./../common/controller-factory');

var Controller = new ControllerFactory(Audit)
    .findController({
        query: {
            by: Joi.string(),
            objectType: Joi.string(),
            objectChangedId: Joi.string()
        }
    }, function buildFindQuery (request) {
        var query = {};
        if (request.query.by) {
            query.by = {$regex: new RegExp('^.*?' + request.query.by + '.*$', 'i')};
        }
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
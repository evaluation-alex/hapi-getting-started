'use strict';
var Joi = require('joi');
var Audit = require('./model');
var BaseController = require('./../common/controller').BaseController;

var Controller = {};

Controller.find = BaseController.find('audit', Audit, function (request) {
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
});

Controller.find.validator = {
    query: {
        by: Joi.string(),
        objectType: Joi.string(),
        objectChangedId: Joi.string(),
        fields: Joi.string(),
        sort: Joi.string(),
        limit: Joi.number().default(20),
        page: Joi.number().default(1)
    }
};

module.exports.Controller = Controller;
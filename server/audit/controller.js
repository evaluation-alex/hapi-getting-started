'use strict';
var Joi = require('joi');
var Audit = require('./model');
var BaseController = require('./../common/controller').BaseController;

var Controller = {};

Controller.find = BaseController.find('audit', Audit, {
    query: {
        by: Joi.string(),
        objectType: Joi.string(),
        objectChangedId: Joi.string()
    }
}, function (request) {
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

module.exports.Controller = Controller;
'use strict';
var Joi = require('joi');
var AuthAttempts = require('./model');
var ControllerFactory = require('./../../../common/controller-factory');
var utils = require('./../../../common/utils');

var Controller = new ControllerFactory(AuthAttempts)
    .findController({
        query: {
            ip: Joi.string(),
            email: Joi.string()
        }
    }, function buildFindQuery (request) {
        var query = utils.buildQueryFromRequestForFields({}, request, [['ip', 'ip'], ['email', 'email']]);
        query.organisation = '*';
        return query;
    })
    .doneConfiguring();

module.exports = Controller;

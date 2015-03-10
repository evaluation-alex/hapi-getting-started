'use strict';
var Joi = require('joi');
var AuthAttempts = require('./model');
var ControllerFactory = require('./../common/controller-factory');

var Controller = new ControllerFactory(AuthAttempts)
    .findController({
        query: {
            ip: Joi.string(),
            email: Joi.string()
        }
    }, function buildFindQuery (request) {
        var query = {};
        if (request.query.ip) {
            query.ip = request.query.ip;
        }
        if (request.query.email) {
            query.email = {$regex: new RegExp('^.*?' + request.query.email + '.*$', 'i')};
        }
        query.organisation = '*';
        return query;
    })
    .doneConfiguring();

module.exports = Controller;

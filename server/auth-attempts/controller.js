'use strict';
var Joi = require('joi');
var AuthAttempts = require('./model');
var BaseController = require('./../common/controller').BaseController;

var Controller = {};

Controller.find = BaseController.find('auth-attempts', AuthAttempts, {
    query: {
        ip: Joi.string(),
        email: Joi.string()
    }
}, function (request) {
    var query = {};
    if (request.query.ip) {
        query.ip = request.query.ip;
    }
    if (request.query.email) {
        query.email = {$regex: new RegExp('^.*?' + request.query.email + '.*$', 'i')};
    }
    query.organisation = '*';
    return query;
});

Controller.delete = BaseController.delete('auth-attempts', AuthAttempts);

module.exports.Controller = Controller;
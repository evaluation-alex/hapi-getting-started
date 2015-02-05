'use strict';
var Joi = require('joi');
var Boom = require('boom');
var Promise = require('bluebird');
var BaseModel = require('hapi-mongo-models').BaseModel;
var AuthAttempts = require('./model');
var AuthPlugin = require('./../common/auth');
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
    return query;
});

Controller.delete = {
    pre: [AuthPlugin.preware.ensurePermissions('view', 'auth-attempts')],
    handler: function (request, reply) {
        AuthAttempts.findByIdAndRemove(BaseModel.ObjectID(request.params.id), function (err, count) {
            if (err) {
                reply(Boom.badImplementation(err));
            } else if (count === 0) {
                reply(Boom.notFound('Document not found.'));
            } else {
                reply({message: 'Success.'});
            }
        });
    }
};

module.exports.Controller = Controller;
'use strict';
var Joi = require('joi');
var Boom = require('boom');
var Promise = require('bluebird');
var AuthAttempts = require('./model');

var Controller = {};

Controller.find = {
    validator: {
        query: {
            ip: Joi.string(),
            email: Joi.string(),
            fields: Joi.string(),
            sort: Joi.string(),
            limit: Joi.number().default(20),
            page: Joi.number().default(1)
        }
    },
    handler: function (request, reply) {
        var query = {};
        var fields = request.query.fields;
        var sort = request.query.sort;
        var limit = request.query.limit;
        var page = request.query.page;
        if (request.query.ip) {
            query.ip = request.query.ip;
        }
        if (request.query.email) {
            query.email = {$regex: new RegExp('^.*?' + request.query.email + '.*$', 'i')};
        }
        AuthAttempts.pagedFind(query, fields, sort, limit, page, function (err, results) {
            if (err) {
                reply(Boom.badImplementation(err));
            } else {
                reply(results);
            }
        });
    }
};

Controller.delete = {
    handler: function (request, reply) {
        AuthAttempts.findByIdAndRemove(request.params.id, function (err, count) {
            if (err) {
                reply(Boom.badImplementation(err));
            } else if (count === 0) {
                reply(Boom.notFound('Document not found.'));
            } else {
                reply({ message: 'Success.' });
            }
        });
    }
};

module.exports.Controller = Controller;
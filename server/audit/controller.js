'use strict';
var Joi = require('joi');
var Boom = require('boom');
var Audit = require('./model');

var Controller = {};

Controller.find = {
    validator : {
        query: {
            by: Joi.string(),
            objectType: Joi.string(),
            objectChangedId: Joi.string(),
            fields: Joi.string(),
            sort: Joi.string(),
            limit: Joi.number().default(20),
            page: Joi.number().default(1)
        }
    },
    handler: function (request, reply) {
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
        var fields = request.query.fields;
        var sort = request.query.sort;
        var limit = request.query.limit;
        var page = request.query.page;
        Audit.pagedFind(query, fields, sort, limit, page, function (err, audits) {
            if (err) {
                reply(Boom.badImplementation(err));
            } else {
                reply(audits);
            }
        });
    }
};

module.exports.Controller = Controller;
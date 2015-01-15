'use strict';
var Joi = require('joi');
var Hoek = require('hoek');
var AuthPlugin = require('./../auth');
var Boom = require('boom');

exports.register = function (server, options, next) {
    options = Hoek.applyToDefaults({basePath: ''}, options);
    server.route({
        method: 'GET',
        path: options.basePath + '/audit',
        config: {
            auth: {
                strategy: 'simple'
            },
            validate: {
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
            pre: [
                AuthPlugin.preware.ensurePermissions('view', 'users-audit')
            ]
        },
        handler: function (request, reply) {
            var Audit = request.server.plugins['hapi-mongo-models'].Audit;
            var query = {};
            if (request.query.by) {
                query = {by: new RegExp('^.*?' + request.query.by + '.*$', 'i')};
            }
            if (request.query.objectType) {
                query = {objectChangedType: request.query.objectType};
            }
            if (request.query.objectChangedId) {
                query = {objectChangedId: request.query.objectChangedId};
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
    });

    next();
};

exports.register.attributes = {
    name: 'audit'
};

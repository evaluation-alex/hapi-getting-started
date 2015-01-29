'use strict';
var Joi = require('joi');
var Hoek = require('hoek');
var AuthPlugin = require('./../auth');
var Boom = require('boom');

exports.register = function (server, options, next) {
    options = Hoek.applyToDefaults({ basePath: '' }, options);
    server.route({
        method: 'GET',
        path: options.basePath + '/auth-attempts',
        config: {
            auth: {
                strategy: 'simple'
            },
            validate: {
                query: {
                    ip: Joi.string(),
                    email: Joi.string(),
                    fields: Joi.string(),
                    sort: Joi.string(),
                    limit: Joi.number().default(20),
                    page: Joi.number().default(1)
                }
            },
            pre: [
                AuthPlugin.preware.ensurePermissions('view', 'auth-attempts')
            ]
        },
        handler: function (request, reply) {
            var AuthAttempts = request.server.plugins['hapi-mongo-models'].AuthAttempts;
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
    });

    server.route({
        method: 'DELETE',
        path: options.basePath + '/auth-attempts/{id}',
        config: {
            auth: {
                strategy: 'simple'
            },
            pre: [
                AuthPlugin.preware.ensurePermissions('update', 'auth-attempts')
            ]
        },
        handler: function (request, reply) {
            var AuthAttempts = request.server.plugins['hapi-mongo-models'].AuthAttempts;
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
    });
    next();
};

exports.register.attributes = {
    name: 'auth-attempts'
};

'use strict';
var Joi = require('joi');
var Hoek = require('hoek');
var AuthPlugin = require('./../auth');
var Boom = require('boom');

exports.register = function (server, options, next) {
    options = Hoek.applyToDefaults({basePath: ''}, options);
    server.route({
        method: 'GET',
        path: options.basePath + '/users-audit',
        config: {
            auth: {
                strategy: 'simple'
            },
            validate: {
                query: {
                    userId: Joi.string().required(),
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
            var UsersAudit = request.server.plugins['hapi-mongo-models'].UsersAudit;
            var query = {userId: new RegExp('^.*?' + request.query.userId + '.*$', 'i')};
            var fields = request.query.fields;
            var sort = request.query.sort;
            var limit = request.query.limit;
            var page = request.query.page;
            UsersAudit.pagedFind(query, fields, sort, limit, page, function (err, usersAudit) {
                if (err) {
                    reply(Boom.badImplementation(err));
                } else {
                    reply(usersAudit);
                }
            });
        }
    });

    next();
};

exports.register.attributes = {
    name: 'users-audit'
};

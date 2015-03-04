'use strict';
var Boom = require('boom');
var _ = require('lodash');
var BaseModel = require('hapi-mongo-models').BaseModel;
var logger = require('./../manifest').logger;

var isUnique = function (Model, queryBuilder) {
    return function (request, reply) {
        if (queryBuilder) {
            var query = queryBuilder(request);
            Model._findOne(query)
                .then(function (f) {
                    if (f) {
                        reply(Boom.conflict('Object already exists'));
                    } else {
                        reply(true);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        }
    };
};

module.exports.isUnique = isUnique;

var areValid = function (Model, docPropertyToLookup, payloadPropertyToLookup) {
    return function (request, reply) {
        if (request.payload[payloadPropertyToLookup] && request.payload[payloadPropertyToLookup].length > 0) {
            var msg = 'Bad data : ';
            Model.areValid(docPropertyToLookup, request.payload[payloadPropertyToLookup], request.auth.credentials.user.organisation)
                .then(function (validated) {
                    _.forEach(request.payload[payloadPropertyToLookup], function (a) {
                        if (!validated[a]) {
                            msg += a + ',';
                        }
                    });
                })
                .then(function () {
                    if (msg.indexOf(',') > -1) {
                        reply(Boom.badData(msg));
                    } else {
                        reply();
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        } else {
            reply();
        }
    };
};

module.exports.areValid = areValid;

var validAndPermitted = function (Model, idProperty, groups){
    return function (request, reply) {
        var id = request.params[idProperty] ? request.params[idProperty] : request.query[idProperty];
        Model.isValid(BaseModel.ObjectID(id), groups, request.auth.credentials.user.email)
            .then(function (m) {
                var cases = {
                    'valid': function () {
                        reply();
                    },
                    'not found': function () {
                        reply(Boom.notFound(JSON.stringify(m)));
                    }
                };
                cases['not a member of ' + JSON.stringify(groups) + ' list'] = function () {
                    reply(Boom.unauthorized(JSON.stringify(m)));
                };
                cases[m.message]();
            })
            .catch(function (err) {
                reply(Boom.badImplementation(err));
            });
    };
};

module.exports.validAndPermitted = validAndPermitted;

var ensurePermissions = function (forAction, onObject) {
    return {
        assign: 'ensurePermissions',
        method: function (request, reply) {
            var ret = request.auth.credentials.user.hasPermissionsTo(forAction, onObject);
            if (!ret) {
                logger.warn(['rolePermissions', 'error'], {
                    user: request.auth.credentials.user.email,
                    action: forAction,
                    object: onObject,
                    request: {id: request.id, method: request.method, path: request.path}
                });
                return reply(Boom.forbidden('Permission denied ' + forAction + ' on ' + onObject));
            }
            reply();
        }
    };
};

module.exports.ensurePermissions = ensurePermissions;

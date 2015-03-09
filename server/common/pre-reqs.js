'use strict';
var Boom = require('boom');
var _ = require('lodash');
var utils = require('./utils');

module.exports.isUnique = function isUnique (Model, queryBuilder) {
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
                    utils.logAndBoom(err, reply);
                });
        }
    };
};

module.exports.areValid = function areValid (Model, docPropertyToLookup, payloadPropertiesToLookup) {
    return function (request, reply) {
        var toLookup = [];
        payloadPropertiesToLookup.forEach(function (payloadPropertyToLookup){
            if (request.payload[payloadPropertyToLookup] && request.payload[payloadPropertyToLookup].length > 0) {
                toLookup.push(request.payload[payloadPropertyToLookup]);
            }
        });
        toLookup = _.flatten(toLookup);
        if (toLookup.length > 0) {
            var msg = 'Bad data : ';
            Model.areValid(docPropertyToLookup, toLookup, request.auth.credentials.user.organisation)
                .then(function (validated) {
                    _.forEach(toLookup, function (a) {
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
                    utils.logAndBoom(err, reply);
                });
        } else {
            reply();
        }
    };
};

module.exports.validAndPermitted = function validAndPermitted (Model, idProperty, groups){
    return function (request, reply) {
        var id = request.params[idProperty] ? request.params[idProperty] : request.query[idProperty];
        Model.isValid(Model.ObjectID(id), groups, request.auth.credentials.user.email)
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
                utils.logAndBoom(err, reply);
            });
    };
};

module.exports.ensurePermissions = function ensurePermissions (forAction, onObject) {
    return {
        assign: 'ensurePermissions',
        method: function (request, reply) {
            var ret = request.auth.credentials.user.hasPermissionsTo(forAction, onObject);
            if (!ret) {
                return reply(Boom.forbidden('Permission denied ' + forAction + ' on ' + onObject + ' for user ' + request.auth.credentials.user.email));
            }
            reply();
        }
    };
};

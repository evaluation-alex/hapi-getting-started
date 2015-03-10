'use strict';
var Boom = require('boom');
var _ = require('lodash');
var utils = require('./../utils');

module.exports = function validAndPermitted (Model, idProperty, groups) {
    return {
        assign: 'validAndPermitted' + _.capitalize(Model._collection),
        method: function objectIsValidAndUserAllowed (request, reply) {
            var id = request.params[idProperty] ? request.params[idProperty] : request.query[idProperty];
            if (!id) {
                reply(Boom.notFound('parameters not passed correctly'));
            } else {
                Model.isValid(Model.ObjectID(id), request.auth.credentials.user.email, groups)
                    .then(function (m) {
                        var cases = {
                            'valid': function () {
                                reply(m.obj);
                            },
                            'not found': function () {
                                reply(Boom.notFound(_.capitalize(Model._collection) + ' (' + id.toString() + ') not found'));
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
            }
        }
    };
};

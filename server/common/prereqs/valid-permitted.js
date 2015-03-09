'use strict';
var Boom = require('boom');
var utils = require('./../utils');

module.exports = function validAndPermitted (Model, idProperty, groups) {
    return {
        assign: 'validAndPermitted',
        method: function objectIsValidAndUserAllowed (request, reply) {
            var id = request.params[idProperty] ? request.params[idProperty] : request.query[idProperty];
            Model.isValid(Model.ObjectID(id), request.auth.credentials.user.email, groups)
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
        }
    };
};

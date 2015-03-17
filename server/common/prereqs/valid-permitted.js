'use strict';
var Boom = require('boom');
var _ = require('lodash');
var utils = require('./../utils');
var i18n = require('./../../../config').i18n;

module.exports = function validAndPermitted (Model, idProperty, groups) {
    return {
        assign: 'validAndPermitted' + _.capitalize(Model._collection),
        method: function objectIsValidAndUserAllowed (request, reply) {
            var id = request.params[idProperty] ? request.params[idProperty] : request.query[idProperty];
            if (!id) {
                reply(Boom.notFound(i18n.__({
                    phrase: 'parameters not passed correctly',
                    locale: utils.locale(request)
                })));
            } else {
                Model.isValid(Model.ObjectID(id), request.auth.credentials.user.email, groups)
                    .then(function (m) {
                        var cases = {
                            'valid': function () {
                                reply(m.obj);
                            },
                            'not found': function () {
                                reply(Boom.notFound(i18n.__({
                                    phrase: '{{type}} ({{idstr}}) not found',
                                    locale: utils.locale(request)
                                }, {
                                    type: Model._collection,
                                    idstr: id.toString()
                                })));
                            }
                        };
                        cases['not a member of list'] = function () {
                            reply(Boom.unauthorized(i18n.__({
                                phrase: 'Only members of {{owners}} group are permitted to perform this action',
                                locale: utils.locale(request)
                            }, {
                                owners: JSON.stringify(groups)
                            })));
                        };
                        cases[m.message]();
                    })
                    .catch(function (err) {
                        utils.logAndBoom(err, utils.locale(request), reply);
                    });
            }
        }
    };
};

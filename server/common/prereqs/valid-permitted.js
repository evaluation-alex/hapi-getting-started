'use strict';
var _ = require('lodash');
var utils = require('./../utils');
var Promise = require('bluebird');
var errors = require('./../errors');

module.exports = function validAndPermitted (Model, idProperty, groups) {
    return {
        assign: 'validAndPermitted' + _.capitalize(Model._collection),
        method: function objectIsValidAndUserAllowed (request, reply) {
            var id = utils.lookupParamsOrPayloadOrQuery(request, idProperty);
            Model.isValid(Model.ObjectID(id), request.auth.credentials.user.email, groups)
                .then(function (m) {
                    var cases = {
                        'valid': function () {
                            reply(m.obj);
                        },
                        'not found': function () {
                            return Promise.reject(new errors.ObjectNotFoundError({
                                type: Model._collection,
                                idstr: id.toString()
                            }));
                        },
                        'not permitted': function () {
                            return Promise.reject(new errors.NotAMemberOfValidGroupError({owners: JSON.stringify(groups)}));
                        }
                    };
                    return cases[m.message]();
                })
                .catch(function (err) {
                    utils.logAndBoom(err, reply);
                });
        }
    };
};

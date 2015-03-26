'use strict';
var _ = require('lodash');
var errors = require('./../errors');

module.exports = function onlyOwnerAllowed (Model, fieldToVerifyAgainst) {
    return {
        assign: 'allowedToViewOrEditPersonalInfo',
        method: function allowedToViewOrEditPersonalInfo (request, reply) {
            var objToInspect = request.pre['validAndPermitted' + _.capitalize(Model._collection)] || request.pre[Model._collection];
            if ((objToInspect && objToInspect[fieldToVerifyAgainst] === request.auth.credentials.user.email) ||
                (request.auth.credentials.user.email === 'root')) {
                reply();
            } else {
                reply(new errors.NotObjectOwnerError({
                    email: request.auth.credentials.user.email
                }));
            }
        }
    };
};

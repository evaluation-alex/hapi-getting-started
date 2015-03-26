'use strict';
var _ = require('lodash');
var utils = require('./../utils');
var i18n = require('./../../../config').i18n;
var Boom = require('boom');

module.exports = function onlyOwnerAllowed (Model, fieldToVerifyAgainst) {
    return {
        assign: 'allowedToViewOrEditPersonalInfo',
        method: function allowedToViewOrEditPersonalInfo (request, reply) {
            var objToInspect = request.pre['validAndPermitted' + _.capitalize(Model._collection)] || request.pre[Model._collection];
            if ((objToInspect && objToInspect[fieldToVerifyAgainst] === request.auth.credentials.user.email) ||
                (request.auth.credentials.user.email === 'root')) {
                reply();
            } else {
                reply(Boom.unauthorized(i18n.__({
                    phrase: '{{email}} does not have permission to modify',
                    locale: utils.locale(request)
                }, {
                    email: request.auth.credentials.user.email
                })));
            }
        }
    };
};

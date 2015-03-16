'use strict';
var Boom = require('boom');
var i18n = require('./../../../config').i18n;
var utils = require('./../utils');

module.exports = function ensurePermissions (forAction, onObject) {
    return {
        assign: 'ensurePermissions',
        method: function userRoleHasPerms (request, reply) {
            var ret = request.auth.credentials.user.hasPermissionsTo(forAction, onObject);
            if (!ret) {
                return reply(Boom.forbidden(i18n.__({
                    phrase: 'Permission denied {{action}} on {{object}} for user {{user}}',
                    locale: utils.locale(request)
                }, {action: forAction,
                    object: onObject,
                    user: request.auth.credentials.user.email
                })));
            }
            reply();
        }
    };
};

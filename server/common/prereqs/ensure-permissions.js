'use strict';
var errors = require('./../errors');

module.exports = function ensurePermissions (forAction, onObject) {
    return {
        assign: 'ensurePermissions',
        method: function userRoleHasPerms (request, reply) {
            var ret = request.auth.credentials.user.hasPermissionsTo(forAction, onObject);
            if (!ret) {
                return reply(new errors.NoPermissionsForActionError({
                    action: forAction,
                    object: onObject,
                    user: request.auth.credentials.user.email
                }));
            }
            reply();
        }
    };
};

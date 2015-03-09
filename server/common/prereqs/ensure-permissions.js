'use strict';
var Boom = require('boom');

module.exports = function ensurePermissions (forAction, onObject) {
    return {
        assign: 'ensurePermissions',
        method: function userRoleHasPerms (request, reply) {
            var ret = request.auth.credentials.user.hasPermissionsTo(forAction, onObject);
            if (!ret) {
                return reply(Boom.forbidden('Permission denied ' + forAction + ' on ' + onObject + ' for user ' + request.auth.credentials.user.email));
            }
            reply();
        }
    };
};

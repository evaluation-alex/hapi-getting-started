'use strict';
let errors = require('./../errors');
module.exports = (forAction, onObject) => {
    return {
        assign: 'ensurePermissions',
        method: (request, reply) => {
            let ret = request.auth.credentials.user.hasPermissionsTo(forAction, onObject);
            if (!ret) {
                return reply(new errors.NoPermissionsForActionError({
                    action: forAction,
                    object: onObject,
                    user: request.auth.credentials.user.email
                }));
            }
            reply(true);
        }
    };
};

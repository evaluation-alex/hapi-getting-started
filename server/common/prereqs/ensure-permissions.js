'use strict';
let errors = require('./../errors');
let utils = require('./../utils');
module.exports = (forAction, onObject) => {
    return {
        assign: 'ensurePermissions',
        method: (request, reply) => {
            reply(
                !utils.user(request).hasPermissionsTo(forAction, onObject) ?
                new errors.NoPermissionsForActionError({action: forAction, object: onObject, user: utils.by(request)}) :
                true
            );
        }
    };
};

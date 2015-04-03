'use strict';
let errors = require('./../errors');
module.exports = (Model, fieldToVerifyAgainst) => {
    return {
        assign: 'allowedToViewOrEditPersonalInfo',
        method: (request, reply) => {
            if ((request.pre[Model.collection][fieldToVerifyAgainst] === request.auth.credentials.user.email) ||
                (request.auth.credentials.user.email === 'root')) {
                reply(true);
            } else {
                reply(new errors.NotObjectOwnerError({
                    email: request.auth.credentials.user.email
                }));
            }
        }
    };
};

'use strict';
let errors = require('./../errors');
let utils = require('./../utils');
module.exports = (Model, fieldToVerifyAgainst) => {
    return {
        assign: 'allowedToViewOrEditPersonalInfo',
        method: (request, reply) => {
            let u = utils.by(request);
            if ((request.pre[Model.collection][fieldToVerifyAgainst] === u) || (u === 'root')) {
                reply(true);
            } else {
                reply(new errors.NotObjectOwnerError({email: u}));
            }
        }
    };
};

'use strict';
let _ = require('lodash');
let errors = require('./../errors');
module.exports = (Model, groups) => {
    return {
        assign: 'isMemberOf' + _.capitalize(Model.collection) + '(' + groups.join(',') + ')',
        method: (request, reply) => {
            let obj = request.pre[Model.collection];
            let user = request.auth.credentials.user.email;
            if (user === 'root' ||
                !!_.find(groups, (role) => obj.isMemberOf(role, user))) {
                reply(true);
            } else {
                reply(new errors.NotAMemberOfValidGroupError({owners: JSON.stringify(groups)}));
            }
            return {message: 'not permitted'};
        }
    };
};

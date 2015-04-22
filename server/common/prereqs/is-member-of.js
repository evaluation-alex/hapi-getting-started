'use strict';
let _ = require('lodash');
let errors = require('./../errors');
let utils = require('./../utils');
module.exports = (Model, groups) => {
    return {
        assign: 'isMemberOf' + _.capitalize(Model.collection) + '(' + groups.join(',') + ')',
        method: (request, reply) => {
            let obj = request.pre[Model.collection];
            let user = utils.by(request);
            if (user === 'root' || !!_.find(groups, (role) => obj['isPresentIn' + role.split('.').map(_.capitalize).join('')](user))) {
                reply(true);
            } else {
                reply(new errors.NotAMemberOfValidGroupError({owners: JSON.stringify(groups)}));
            }
            return {message: 'not permitted'};
        }
    };
};

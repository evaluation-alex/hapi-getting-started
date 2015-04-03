'use strict';
let _ = require('lodash');
var Promise = require('bluebird');
let utils = require('./../utils');
let Users = require('./../../users/model');
let UserGroups = require('./../../user-groups/model');
let errors = require('./../errors');
var areValid = (Model, pldPropToLookup) => {
    return (request, reply) => {
        let toLookup = [];
        _.forEach(pldPropToLookup, (pldProp) => {
            if (utils.hasItems(request.payload[pldProp])) {
                toLookup.push(request.payload[pldProp]);
            }
        });
        toLookup = _.flatten(toLookup);
        if (utils.hasItems(toLookup)) {
            Model.areValid(toLookup, request.auth.credentials.user.organisation)
                .then((validated) => {
                    let msg = '';
                    _.forEach(toLookup, (a) => {
                        if (!validated[a]) {
                            msg += a + ',';
                        }
                    });
                    if (msg.indexOf(',') > -1) {
                        return Promise.reject(new errors.NotValidUsersOrGroupsError({msg: msg}));
                    }
                    reply(true);
                })
                .catch((err) => utils.logAndBoom(err, reply));
        } else {
            reply(true);
        }
    };
};
module.exports.users = (payloadPropertiesToLookup) => {
    return {
        assign: 'validUsers',
        method: areValid(Users, payloadPropertiesToLookup)
    };
};
module.exports.groups = (payloadPropertiesToLookup) => {
    return {
        assign: 'validUserGroups',
        method: areValid(UserGroups, payloadPropertiesToLookup)
    };
};

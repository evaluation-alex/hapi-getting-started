'use strict';
var _ = require('lodash');
var Promise = require('bluebird');
var utils = require('./../utils');
var Users = require('./../../users/model');
var UserGroups = require('./../../user-groups/model');
var errors = require('./../errors');
var utils = require('./../utils');
var areValid = function areValid (Model, payloadPropertiesToLookup) {
    return function areValidObjects (request, reply) {
        var toLookup = [];
        payloadPropertiesToLookup.forEach(function (payloadPropertyToLookup) {
            if (utils.hasItems(request.payload[payloadPropertyToLookup])) {
                toLookup.push(request.payload[payloadPropertyToLookup]);
            }
        });
        toLookup = _.flatten(toLookup);
        if (utils.hasItems(toLookup)) {
            Model.areValid(toLookup, request.auth.credentials.user.organisation)
                .then(function (validated) {
                    var msg = '';
                    _.forEach(toLookup, function (a) {
                        if (!validated[a]) {
                            msg += a + ',';
                        }
                    });
                    if (msg.indexOf(',') > -1) {
                        return Promise.reject(new errors.NotValidUsersOrGroupsError({msg: msg}));
                    }
                    reply(true);
                })
                .catch(function (err) {
                    utils.logAndBoom(err, reply);
                });
        } else {
            reply(true);
        }
    };
};
module.exports.users = function validUsers (payloadPropertiesToLookup) {
    return {
        assign: 'validUsers',
        method: areValid(Users, payloadPropertiesToLookup)
    };
};
module.exports.groups = function validGroups (payloadPropertiesToLookup) {
    return {
        assign: 'validUserGroups',
        method: areValid(UserGroups, payloadPropertiesToLookup)
    };
};

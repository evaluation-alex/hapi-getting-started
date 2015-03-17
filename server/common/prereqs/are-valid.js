'use strict';
var _ = require('lodash');
var Promise = require('bluebird');
var utils = require('./../utils');
var Users = require('./../../users/model');
var UserGroups = require('./../../user-groups/model');
var errors = require('./../errors');

var areValid = function areValid (Model, payloadPropertiesToLookup) {
    return function areValidObjects (request, reply) {
        var toLookup = [];
        payloadPropertiesToLookup.forEach(function (payloadPropertyToLookup){
            if (request.payload[payloadPropertyToLookup] && request.payload[payloadPropertyToLookup].length > 0) {
                toLookup.push(request.payload[payloadPropertyToLookup]);
            }
        });
        toLookup = _.flatten(toLookup);
        if (toLookup.length > 0) {
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
                    reply();
                })
                .catch(function (err) {
                    utils.logAndBoom(err, utils.locale(request), reply);
                });
        } else {
            reply();
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

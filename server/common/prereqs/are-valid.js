'use strict';
var _ = require('lodash');
var Boom = require('boom');
var utils = require('./../utils');
var Users = require('./../../users/model');
var UserGroups = require('./../../user-groups/model');

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
            var msg = 'Bad data : ';
            Model.areValid(toLookup, request.auth.credentials.user.organisation)
                .then(function (validated) {
                    _.forEach(toLookup, function (a) {
                        if (!validated[a]) {
                            msg += a + ',';
                        }
                    });
                })
                .then(function () {
                    if (msg.indexOf(',') > -1) {
                        reply(Boom.badData(msg));
                    } else {
                        reply();
                    }
                })
                .catch(function (err) {
                    utils.logAndBoom(err, reply);
                });
        } else {
            reply();
        }
    };
};

module.exports.users = function (payloadPropertiesToLookup) {
    return {
        assign: 'validUsers',
        method: areValid(Users, payloadPropertiesToLookup)
    };
};

module.exports.groups = function (payloadPropertiesToLookup) {
    return {
        assign: 'validUserGroups',
        method: areValid(UserGroups, payloadPropertiesToLookup)
    };
};

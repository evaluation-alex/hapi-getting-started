'use strict';
var Promise = require('bluebird');
let utils = require('./../utils');
let errors = require('./../errors');
module.exports = function isUnique (Model, queryBuilder) {
    return {
        assign: 'uniqueCheck',
        method: function uniqueCheck (request, reply) {
            Model.findOne(queryBuilder(request))
                .then(function (f) {
                    if (f) {
                        return Promise.reject(new errors.ObjectAlreadyExistsError());
                    }
                    reply(true);
                })
                .catch(function (err) {
                    utils.logAndBoom(err, reply);
                });
        }
    };
};

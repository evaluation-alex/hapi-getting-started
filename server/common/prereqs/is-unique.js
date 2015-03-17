'use strict';
var Promise = require('bluebird');
var utils = require('./../utils');
var errors = require('./../errors');

module.exports = function isUnique (Model, queryBuilder) {
    return {
        assign: 'uniqueCheck',
        method: function uniqueCheck (request, reply) {
            var query = queryBuilder(request);
            Model._findOne(query)
                .then(function (f) {
                    if (f) {
                        return Promise.reject(new errors.ObjectAlreadyExistsError());
                    }
                    reply(true);
                })
                .catch(function (err) {
                    utils.logAndBoom(err, utils.locale(request), reply);
                });
        }
    };
};

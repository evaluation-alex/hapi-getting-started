'use strict';
var Boom = require('boom');
var utils = require('./../utils');
var i18n = require('./../../../config').i18n;

module.exports = function isUnique (Model, queryBuilder) {
    return {
        assign: 'uniqueCheck',
        method: function uniqueCheck (request, reply) {
            var query = queryBuilder(request);
            Model._findOne(query)
                .then(function (f) {
                    if (f) {
                        reply(Boom.conflict(i18n.__({phrase: 'Object already exists', locale: utils.locale(request)})));
                    } else {
                        reply(true);
                    }
                })
                .catch(function (err) {
                    utils.logAndBoom(err, utils.locale(request), reply);
                });
        }
    };
};

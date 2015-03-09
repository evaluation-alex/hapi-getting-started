'use strict';
var Boom = require('boom');
var utils = require('./../utils');

module.exports = function isUnique (Model, queryBuilder) {
    return {
        assign: 'uniqueCheck',
        method: function uniqueCheck (request, reply) {
            if (queryBuilder) {
                var query = queryBuilder(request);
                Model._findOne(query)
                    .then(function (f) {
                        if (f) {
                            reply(Boom.conflict('Object already exists'));
                        } else {
                            reply(true);
                        }
                    })
                    .catch(function (err) {
                        utils.logAndBoom(err, reply);
                    });
            }
        }
    };
};

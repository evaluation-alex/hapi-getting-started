'use strict';
let Promise = require('bluebird');
let utils = require('./../utils');
let errors = require('./../errors');
module.exports = (Model, queryBuilder) => {
    return {
        assign: 'uniqueCheck',
        method: (request, reply) => {
            Model.findOne(queryBuilder(request))
                .then((f) => {
                    if (f) {
                        return Promise.reject(new errors.ObjectAlreadyExistsError());
                    }
                    reply(true);
                })
                .catch((err) => utils.logAndBoom(err, reply));
        }
    };
};

'use strict';
var Promise = require('bluebird');
var utils = require('./../utils');

module.exports = function createFindOneHandler (Model, findOneCb) {
    var findOne = function findOneCB(output) {
        return Promise.resolve(findOneCb ? findOneCb(output) : output);
    };
    return function findOneHandler (request, reply) {
        findOne(request.pre[Model._collection])
            .then(reply)
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};

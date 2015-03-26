'use strict';
var Promise = require('bluebird');
var utils = require('./../utils');

module.exports = function FindOneHandler (Model, findOneCb) {
    var findOneHook = function findOneCB(output) {
        /*jshint unused:false*/
        return new Promise(function (resolve, reject) {
            resolve(findOneCb ? findOneCb(output) : output);
        });
        /*jshint unused:true*/
    };
    return function findOneHandler (request, reply) {
        findOneHook(request.pre[Model._collection])
            .then(reply)
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};

'use strict';
var Promise = require('bluebird');
var utils = require('./../utils');

module.exports = function FindOneHandler (Model, i18nEnabled, findOneCb) {
    var findOne = function findOneCB(output) {
        /*jshint unused:false*/
        return new Promise(function (resolve, reject) {
            resolve(findOneCb ? findOneCb(output) : output);
        });
        /*jshint unused:true*/
    };
    return function findOneHandler (request, reply) {
        findOne(request.pre[Model._collection])
            .then(function (o) {
                reply(i18nEnabled ? o.i18n(utils.locale(request)) : o);
            })
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};

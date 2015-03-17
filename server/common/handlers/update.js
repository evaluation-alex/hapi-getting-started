'use strict';
var _ = require('lodash');
var utils = require('./../utils');
var Promise = require('bluebird');

module.exports = function UpdateHandler (Model, notify, i18nEnabled, updateCb) {
    var updateOneHook = function updateCB(u ,request, by) {
        /*jshint unused:false*/
        return new Promise(function (resolve, reject) {
            resolve(_.isFunction(updateCb) ? updateCb(u, request, by) : u[updateCb](request, by));
        });
        /*jshint unused:true*/
    };
    return function updateHandler (request, reply) {
        var u = request.pre[Model._collection];
        var by = request.auth.credentials.user.email;
        updateOneHook(u, request, by)
            .then(function (u){
                return u.save();
            })
            .then(function (u) {
                if (notify.emit) {
                    notify.emit('invoked', u, request);
                }
                reply(i18nEnabled ? u.i18n(utils.locale(request)) : u);
            })
            .catch(function (err) {
                utils.logAndBoom(err, utils.locale(request), reply);
            });
    };
};

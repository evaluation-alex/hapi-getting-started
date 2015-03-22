'use strict';
var utils = require('./../utils');
var Promise = require('bluebird');
var errors = require('./../errors');

module.exports = function NewHandler (Model, notify, i18nEnabled, newCb) {
    var newObjHook = function newObjCb (request, by) {
        /*jshint unused:false*/
        return new Promise(function (resolve, reject) {
            resolve(newCb ? newCb(request, by) : Model.newObject(request, by));
        });
        /*jshint unused:true*/
    };
    return function createHandler (request, reply) {
        var by = request.auth.credentials ? request.auth.credentials.user.email : 'notloggedin';
        newObjHook(request, by)
            .then(function (n) {
                if (notify.emit) {
                    notify.emit('invoked', n, request);
                }
                reply(i18nEnabled ? n.i18n(utils.locale(request)) : n).code(201);
            }).catch(function (err) {
                utils.logAndBoom(err, utils.locale(request), reply);
            });
    };
};

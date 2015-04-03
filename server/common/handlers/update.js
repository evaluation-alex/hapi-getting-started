'use strict';
let _ = require('lodash');
let utils = require('./../utils');
var Promise = require('bluebird');
module.exports = function UpdateHandler (Model, notify, updateCb) {
    let updateHook = function updateObjCb (u, request, by) {
        /*jshint unused:false*/
        return new Promise(function (resolve, reject) {
            resolve(_.isFunction(updateCb) ? updateCb(u, request, by) : u[updateCb](request, by));
        });
        /*jshint unused:true*/
    };
    return function updateHandler (request, reply) {
        let u = request.pre[Model.collection];
        let by = request.auth.credentials.user.email;
        updateHook(u, request, by)
            .then(function (u) {
                return u.save();
            })
            .then(function (u) {
                if (notify.emit) {
                    notify.emit('invoked', u, request);
                }
                reply(u);
            })
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};

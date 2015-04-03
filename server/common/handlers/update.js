'use strict';
let _ = require('lodash');
let utils = require('./../utils');
var Promise = require('bluebird');
module.exports = function UpdateHandler (Model, notify, updateCb) {
    /*jshint unused:false*/
    let updateHook = (u, request, by) =>
            new Promise((resolve, reject) =>
            resolve(_.isFunction(updateCb) ?
                updateCb(u, request, by) :
                u[updateCb](request, by)
            )
        );
    /*jshint unused:true*/
    return (request, reply) => {
        let u = request.pre[Model.collection];
        let by = request.auth.credentials.user.email;
        updateHook(u, request, by)
            .then((u) => u.save())
            .then((u) => {
                if (notify.emit) {
                    notify.emit('invoked', u, request);
                }
                reply(u);
            })
            .catch((err) => utils.logAndBoom(err, reply));
    };
};

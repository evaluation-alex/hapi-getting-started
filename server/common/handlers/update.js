'use strict';
let _ = require('lodash');
let utils = require('./../utils');
let Promise = require('bluebird');
module.exports = function UpdateHandler (Model, notify, updateCb) {
    let updateHook = Promise.method((u, request, by) =>
        _.isFunction(updateCb) ? updateCb(u, request, by) : u[updateCb](request, by)
    );
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

'use strict';
let _ = require('lodash');
let utils = require('./../utils');
let Bluebird = require('bluebird');
module.exports = (Model, notify, updateCb) => {
    let updateHook = Bluebird.method((u, request, by) =>
        _.isFunction(updateCb) ? updateCb(u, request, by) : u[updateCb](request, by)
    );
    return (request, reply) => {
        updateHook(request.pre[Model.collection], request, utils.by(request))
            .then(u => u.save())
            .then(u => {
                if (notify.emit) {
                    notify.emit('invoked', u, request);
                }
                reply(u);
            })
            .catch((err) => utils.logAndBoom(err, reply));
    };
};

'use strict';
let utils = require('./../utils');
let Bluebird = require('bluebird');
module.exports = function NewHandler (Model, notify, newCb) {
    let newObjHook = Bluebird.method((request, by) => newCb ? newCb(request, by) : Model.newObject(request, by));
    return (request, reply) => {
        let by = request.auth.credentials ? request.auth.credentials.user.email : 'notloggedin';
        newObjHook(request, by)
            .then((n) => {
                if (notify.emit) {
                    notify.emit('invoked', n, request);
                }
                reply(n).code(201);
            })
            .catch((err) => utils.logAndBoom(err, reply));
    };
};

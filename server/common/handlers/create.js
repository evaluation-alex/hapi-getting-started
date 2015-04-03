'use strict';
let utils = require('./../utils');
var Promise = require('bluebird');
module.exports = function NewHandler (Model, notify, newCb) {
    /*jshint unused:false*/
    let newObjHook = (request, by) => new Promise((resolve, reject) =>
            resolve(newCb ?
                newCb(request, by) :
                Model.newObject(request, by)
            )
        );
    /*jshint unused:true*/
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

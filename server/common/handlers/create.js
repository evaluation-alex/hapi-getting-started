'use strict';
var Boom = require('boom');
var utils = require('./../utils');
var Promise = require('bluebird');

module.exports = function createNewHandler (Model, notify, newCb) {
    var newObjHook = function newObjCb (request, by) {
        return Promise.resolve(newCb ? newCb(request, by) : Model.newObject(request, by));
    };
    return function createHandler (request, reply) {
        var by = request.auth.credentials ? request.auth.credentials.user.email : 'notloggedin';
        newObjHook(request, by)
            .then(function (n) {
                if (!n) {
                    reply(Boom.notFound(Model._collection + ' object could not be created.'));
                } else {
                    if (notify) {
                        notify.emit('new ' + Model._collection, {object: n, request: request});
                    }
                    reply(n).code(201);
                }
            }).catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};

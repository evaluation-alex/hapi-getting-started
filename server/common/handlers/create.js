'use strict';
var Boom = require('boom');
var utils = require('./../utils');
var Promise = require('bluebird');

module.exports = function NewHandler (Model, notify, i18nEnabled, newCb) {
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
                    if (notify.emit) {
                        notify.emit('invoked', n, request);
                    }
                    reply(i18nEnabled ? n.i18n(utils.locale(request)) : n).code(201);
                }
            }).catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};

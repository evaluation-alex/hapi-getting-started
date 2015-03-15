'use strict';
var _ = require('lodash');
var utils = require('./../utils');

module.exports = function UpdateHandler (Model, notify, i18nEnabled, updateCb) {
    var updateOneHook = function updateCB(u ,request, by) {
        u = _.isFunction(updateCb) ? updateCb(u, request, by) : u[updateCb](request, by);
        return u.save();
    };
    return function updateHandler (request, reply) {
        var u = request.pre[Model._collection];
        var by = request.auth.credentials.user.email;
        updateOneHook(u, request, by)
            .then(function (u) {
                if (notify.emit) {
                    notify.emit('invoked', u, request);
                }
                reply(i18nEnabled ? u.i18n(utils.locale(request)) : u);
            })
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};

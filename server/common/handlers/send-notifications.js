'use strict';
var _ = require('lodash');
var logger = require('./../../../config').logger;
var Promise = require('bluebird');
var Notifications = require('./../../users/notifications/model');

module.exports = function SendNotifications (model, notifyCb) {
    var notifyHook = function notifyCbHook (target, request) {
        return Promise.resolve(notifyCb(target, request));
    };
    return function onNotify(target, request) {
        notifyHook(target, request)
            .then(function (args) {
                if (args.to && args.to.length > 0) {
                    return Notifications.create(_.unique(_.flatten(args.to)),
                        target.organisation,
                        model._collection,
                        target._id,
                        args.title,
                        'unread',
                        args.action ? args.action : 'fyi',
                        args.priority ? args.priority : 'low',
                        args.description,
                        request.auth.credentials.user.email);
                }
            })
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            });
    };
};

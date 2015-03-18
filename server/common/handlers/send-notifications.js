'use strict';
var logger = require('./../../../config').logger;
var Promise = require('bluebird');
var Notifications = require('./../../users/notifications/model');

module.exports = function SendNotifications (model, notifyCb) {
    return function onNotify (target, request) {
        var notifyHook = function notifyCbHook (target, request) {
            /*jshint unused:false*/
            return new Promise(function (resolve, reject) {
                resolve(notifyCb(target, request));
            });
            /*jshint unused:true*/
        };
        return notifyHook(target, request)
            .then(function (args) {
                if (args.to && args.to.length > 0) {
                    return Notifications.create(args.to,
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
                return undefined;
            })
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            })
            .done();
    };
};

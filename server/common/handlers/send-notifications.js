'use strict';
var Promise = require('bluebird');
var Notifications = require('./../../users/notifications/model');
var utils = require('./../utils');
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
                if (utils.hasItems(args.to)) {
                    return Notifications.create(args.to,
                        target.organisation,
                        model.collection,
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
            .catch(utils.errback)
            .done();
    };
};

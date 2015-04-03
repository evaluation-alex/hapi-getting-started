'use strict';
let utils = require('./../utils');
let _ = require('lodash');
module.exports = function AddRemoveNotificationsBuilder (type, roles, owners, idForNotificationsTitle) {
    return function updateNotificationBuilder (obj, request) {
        let description = {};
        let shouldNotify = false;
        _.forEach(roles, function (toInspect) {
            _.forEach(['added', 'removed'], function (t) {
                const p = t + _.capitalize(toInspect);
                if (utils.hasItems(request.payload[p])) {
                    shouldNotify = true;
                    description[toInspect] = description[toInspect] || {};
                    description[toInspect][t] = request.payload[p];
                }
            });
        });
        return {
            to: shouldNotify ? obj[owners] : [],
            title: [type + ' {{title}} updated by {{updatedBy}}', {
                title: obj[idForNotificationsTitle],
                updatedBy: request.auth.credentials.user.email
            }],
            description: description
        };
    };
};

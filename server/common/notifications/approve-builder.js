'use strict';
var utils = require('./../utils');

module.exports = function ApproveNotificationBuilder (toAdd, approvers, idForNotificationsTitle) {
    return function approveNotifications (obj, request) {
        return {
            to: utils.hasItems(request.payload[toAdd]) ? obj[approvers] : [],
            title: ['{{title}} has new approved subscribers', {title: obj[idForNotificationsTitle]}],
            description: utils.hasItems(request.payload[toAdd]) ? {approved: request.payload[toAdd]} : {},
            priority: obj.access === 'restricted' ? 'medium' : 'low'
        };
    };
};

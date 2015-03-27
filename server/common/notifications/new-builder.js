'use strict';

module.exports = function NewObjectNotificationsBuilder (type, owners, title) {
    return function newNotification (obj, request) {
        return {
            to: obj[owners],
            title: [type + ' {{title}} created.', {title: obj[title]}],
            description: [type + ' {{title}} created and you have been designated owner by {{createdBy}}', {
                title: obj[title],
                createdBy: request.auth.credentials.user.email
            }]
        };
    };
};
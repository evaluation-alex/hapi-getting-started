'use strict';

module.exports = function DeleteObjectNotificationsBuilder (type, owners, title) {
    return function deleteNotification (obj, request) {
        return {
            to: obj[owners],
            title: [type + ' {{title}} deleted.', {title: obj[title]}],
            description: [type + ' {{title}} deleted by {{updatedBy}}', {
                title: obj[title],
                updatedBy: request.auth.credentials.user.email
            }]
        };
    };
};


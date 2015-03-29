'use strict';

module.exports = function NewDeleteObjectNotificationsBuilder (type, owners, title, action) {
    var actions = {
        'new': {
            title: type + ' {{title}} created.',
            description: type + ' {{title}} created and you have been designated owner by {{createdBy}}'
        },
        'delete': {
            title: type + ' {{title}} deleted.',
            description: type + ' {{title}} deleted by {{updatedBy}}'
        }
    };
    return function notify (obj, request) {
        return {
            to: obj[owners],
            title: [actions[action].title, {title: obj[title]}],
            description: [actions[action].description, {
                title: obj[title],
                createdBy: request.auth.credentials.user.email
            }]
        };
    };
};
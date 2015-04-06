'use strict';
module.exports = function ObjectCreateDeleteNotificationBuilder (type, owners, title, action) {
    const actions = {
        'new': {
            title: type + ' {{title}} created.',
            description: type + ' {{title}} created and you have been designated owner by {{createdBy}}'
        },
        'delete': {
            title: type + ' {{title}} deleted.',
            description: type + ' {{title}} deleted by {{updatedBy}}'
        }
    };
    return (obj, request) => {
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
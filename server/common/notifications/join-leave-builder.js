'use strict';
module.exports = function JoinLeaveNotificationBuilder (approvers, idForNotificationTitle, action, title, notifyAction) {
    return function joinLeaveNotify (obj, request) {
        var u = request.auth.credentials.email;
        var ret = {
            to: obj[approvers],
            description: {},
            title: [title[obj.access], {
                title: obj[idForNotificationTitle],
                email: u
            }],
            action: notifyAction[obj.access],
            priority: obj.access === 'restricted' ? 'medium' : 'low'
        };
        ret.description[action] = u;
        return ret;
    };
};

'use strict';
let utils = require('./../utils');
module.exports = (approvers, idForNotificationTitle, action, title, notifyAction) => {
    return (obj, request) => {
        let u = utils.by(request);
        let ret = {
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

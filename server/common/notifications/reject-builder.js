'use strict';
let utils = require('./../utils');
module.exports = (toAdd, idForNotificationsTitle) => {
    return (obj, request) => {
        return {
            to: utils.hasItems(request.payload[toAdd]) ? request.payload[toAdd] : [],
            title: ['Your request to follow {{title}} was denied', {
                title: obj[idForNotificationsTitle]
            }],
            description: ['Your request to follow {{title}} was denied by {{updatedBy}}', {
                title: obj[idForNotificationsTitle],
                updatedBy: utils.by(request)
            }]
        };
    };
};

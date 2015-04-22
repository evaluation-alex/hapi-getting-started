'use strict';
let _ = require('lodash');
let utils = require('./../utils');
module.exports = (toAdd) => {
    return (obj, request, notification) => {
        let modified = false;
        _.forEach(request.payload[toAdd], (a) => {
            if (notification.content.join === a) {
                modified = true;
                notification.setState('cancelled', utils.by(request));
            }
        });
        return modified ? notification.save() : notification;
    };
};

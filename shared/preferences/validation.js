'use strict';
const Joi = require('joi');
const channel = {
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly'),
    lastSent: Joi.date()
};
const notificationPref = {
    inapp: channel,
    email: channel,
    blocked: Joi.array().items(Joi.object())
};
const updateChannel = {
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly')
};
const notificationUpdatePref = {
    inapp: updateChannel,
    email: updateChannel,
    addedBlocked: Joi.array().items(Joi.object()),
    removedBlocked: Joi.array().items(Joi.object())
};
module.exports = {
    channel: channel,
    notificationPref: notificationPref,
    updateChannel: updateChannel,
    notificationUpdatePref: notificationUpdatePref,
    controller: {
        update: {
            payload: {
                preferences: {
                    notifications: {
                        blogs: notificationUpdatePref,
                        posts: notificationUpdatePref,
                        userGroups: notificationUpdatePref
                    },
                    locale: Joi.string().only('en', 'hi')
                }
            }
        }
    }
};

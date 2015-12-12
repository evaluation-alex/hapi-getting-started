'use strict';
const Joi = require('joi');
const channelSchema = Joi.object().keys({
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly'),
    lastSent: Joi.date()
});
const notificationPrefSchema = Joi.object().keys({
    inapp: channelSchema,
    email: channelSchema,
    blocked: Joi.array().items(Joi.object())
});
const updateChannelSchema = Joi.object().keys({
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly')
});
const notificationUpdatePrefSchema = Joi.object().keys({
    inapp: updateChannelSchema,
    email: updateChannelSchema,
    addedBlocked: Joi.array().items(Joi.object()),
    removedBlocked: Joi.array().items(Joi.object())
});
module.exports = {
    channel: channelSchema,
    notificationPref: notificationPrefSchema,
    updateChannel: updateChannelSchema,
    notificationUpdatePref: notificationUpdatePrefSchema,
    controller: {
        update: {
            payload: {
                preferences: {
                    notifications: Joi.object().keys({
                        blogs: notificationUpdatePrefSchema,
                        posts: notificationUpdatePrefSchema,
                        userGroups: notificationUpdatePrefSchema
                    }),
                    locale: Joi.string().only('en', 'hi')
                }
            }
        }
    }
};

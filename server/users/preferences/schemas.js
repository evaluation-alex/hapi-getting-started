'use strict';
let Joi = require('joi');
let channelSchema = Joi.object().keys({
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly'),
    lastSent: Joi.date()
});
let notificationPrefSchema = Joi.object().keys({
    inapp: channelSchema,
    email: channelSchema,
    blocked: Joi.array().items(Joi.object())
});
let updateChannelSchema = Joi.object().keys({
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly')
});
let notificationUpdatePrefSchema = Joi.object().keys({
    inapp: updateChannelSchema,
    email: updateChannelSchema,
    addedBlocked: Joi.array().items(Joi.object()),
    removedBlocked: Joi.array().items(Joi.object())
});

module.exports = {
    model: Joi.object().keys({
        notifications: Joi.object().keys({
            blogs: notificationPrefSchema,
            posts: notificationPrefSchema,
            userGroups: notificationPrefSchema
        }),
        locale: Joi.string().only('en', 'hi')
    }),
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
};
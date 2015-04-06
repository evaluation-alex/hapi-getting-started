'use strict';
let Joi = require('joi');
let ModelBuilder = require('./../../common/model-builder');
let channelSchema = Joi.object().keys({
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly'),
    lastSent: Joi.date()
});
let notificationPrefSchema = Joi.object().keys({
    inapp: channelSchema,
    email: channelSchema,
    blocked: Joi.array().items(Joi.object())
});
var Preferences = (new ModelBuilder())
    .virtualModel(function Preferences () {
    })
    .usingSchema(Joi.object().keys({
        notifications: Joi.object().keys({
            blogs: notificationPrefSchema,
            posts: notificationPrefSchema,
            userGroups: notificationPrefSchema
        }),
        locale: Joi.string().only('en', 'hi')
    }))
    .supportUpdates([
        'preferences.notifications.blogs.inapp.frequency',
        'preferences.notifications.blogs.inapp.lastSent',
        'preferences.notifications.blogs.email.frequency',
        'preferences.notifications.blogs.email.lastSent',
        'preferences.notifications.posts.inapp.frequency',
        'preferences.notifications.posts.inapp.lastSent',
        'preferences.notifications.blogs.email.frequency',
        'preferences.notifications.blogs.email.lastSent',
        'preferences.notifications.userGroups.inapp.frequency',
        'preferences.notifications.userGroups.inapp.lastSent',
        'preferences.notifications.userGroups.email.frequency',
        'preferences.notifications.userGroups.email.lastSent',
        'preferences.locale'
    ], [
        'preferences.notifications.blogs.blocked',
        'preferences.notifications.posts.blocked',
        'preferences.notifications.userGroups.blocked'
    ], 'updatePreferences')
    .doneConfiguring();
Preferences.prototype.resetPrefs = () => {
    let self = this;
    self.preferences = Preferences.create();
    return self;
};
Preferences.create = () => {
    return {
        notifications: {
            blogs: {
                inapp: {
                    frequency: 'immediate',
                    lastSent: undefined
                },
                email: {
                    frequency: 'daily',
                    lastSent: undefined
                },
                blocked: []
            },
            posts: {
                inapp: {
                    frequency: 'immediate',
                    lastSent: undefined
                },
                email: {
                    frequency: 'daily',
                    lastSent: undefined
                },
                blocked: []
            },
            userGroups: {
                inapp: {
                    frequency: 'immediate',
                    lastSent: undefined
                },
                email: {
                    frequency: 'daily',
                    lastSent: undefined
                },
                blocked: []
            }
        },
        locale: 'en'
    };
};
module.exports = Preferences;

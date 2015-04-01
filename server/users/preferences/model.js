'use strict';
var Joi = require('joi');
var Properties = require('./../../common/mixins/properties');
var Update = require('./../../common/mixins/update');
var _ = require('lodash');

var Preferences = function Preferences () {
};

var channelSchema = Joi.object().keys({
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly'),
    lastSent: Joi.date()
});

var notificationPrefSchema = Joi.object().keys({
    inapp: channelSchema,
    email: channelSchema,
    blocked: Joi.array().items(Joi.object())
});

Preferences.schema = Joi.object().keys({
    notifications: Joi.object().keys({
        blogs: notificationPrefSchema,
        posts: notificationPrefSchema,
        userGroups: notificationPrefSchema
    }),
    locale: Joi.string().only('en', 'hi')
});

Preferences.arrprops = [
    'preferences.notifications.blogs.blocked',
    'preferences.notifications.posts.blocked',
    'preferences.notifications.userGroups.blocked'
];
_.extend(Preferences.prototype, new Properties([
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
    'preferences.locale']));
_.extend(Preferences.prototype, new Update([
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
], 'updatePreferences'));

Preferences.prototype.resetPrefs = function resetPrefsToDefault () {
    var self = this;
    self.preferences = Preferences.create();
    return self;
};

Preferences.create = function create () {
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

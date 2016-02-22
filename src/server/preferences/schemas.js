'use strict';
const Joi = require('joi');
const shared = require('./../../shared/preferences/validation')(Joi);
module.exports = {
    dao: {
        isVirtualModel: true,
        updateMethod: {
            method: 'updatePreferences',
            props: [
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
            ],
            arrProps: [
                'preferences.notifications.blogs.blocked',
                'preferences.notifications.posts.blocked',
                'preferences.notifications.userGroups.blocked'
            ]
        },
        schemaVersion: 1
    },
    model: {
        notifications: {
            blogs: shared.notificationPref,
            posts: shared.notificationPref,
            userGroups: shared.notificationPref
        },
        locale: Joi.string().only('en', 'hi')
    },
    controller: {
        update: shared.controller.update
    }
};

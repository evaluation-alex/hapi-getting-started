'use strict';
const build = require('./../common/dao').build;
const modelSchema = require('./../../shared/model')(require('joi'), require('./../lodash')).preferences;
const daoOptions = {
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
};
/*istanbul ignore next*/
const Preferences = function Preferences() {};
Preferences.create = function create(locale = 'en') {
        return {
            notifications: {
                blogs: {
                    inapp: {
                        frequency: 'immediate'
                    },
                    email: {
                        frequency: 'daily'
                    },
                    blocked: []
                },
                posts: {
                    inapp: {
                        frequency: 'immediate'
                    },
                    email: {
                        frequency: 'daily'
                    },
                    blocked: []
                },
                userGroups: {
                    inapp: {
                        frequency: 'immediate'
                    },
                    email: {
                        frequency: 'daily'
                    },
                    blocked: []
                }
            },
            locale
        };
    };
Preferences.prototype = {
    resetPrefs() {
        this.preferences = Preferences.create();
        return this;
    }
};
module.exports = build(Preferences, daoOptions, modelSchema);

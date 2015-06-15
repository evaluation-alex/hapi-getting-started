'use strict';
let schemas = require('./schemas');
let ModelBuilder = require('./../../common/model-builder');
var Preferences = (new ModelBuilder())
    .virtualModel()
    .usingSchema(schemas.model)
    .decorateWithUpdates([
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

'use strict';
const build = require('./../common/dao').build;
const schemas = require('./schemas');
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
module.exports = build(Preferences, schemas.dao, schemas.model);

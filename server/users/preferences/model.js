'use strict';
const {build} = require('./../../common/dao');
const schemas = require('./schemas');
class Preferences {
    static create(locale = 'en') {
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
            locale
        };
    }
    resetPrefs() {
        this.preferences = Preferences.create();
        return this;
    }
}
build(Preferences, schemas.dao, schemas.model);
module.exports = Preferences;

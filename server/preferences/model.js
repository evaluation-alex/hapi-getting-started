'use strict';
const {build} = require('./../common/dao');
const schemas = require('./schemas');
const Preferences = function Preferences() {};
Preferences.create = function create(locale = 'en') {
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
    };
Preferences.prototype = {
    resetPrefs() {
        this.preferences = Preferences.create();
        return this;
    }
};
module.exports = build(Preferences, schemas.dao, schemas.model);

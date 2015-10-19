'use strict';
import {build} from './../../common/dao';
import schemas from './schemas';
class Preferences {
    static create() {
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
    }
    resetPrefs() {
        this.preferences = Preferences.create();
        return this;
    }
}
build(Preferences, schemas.dao, schemas.model);
export default Preferences;

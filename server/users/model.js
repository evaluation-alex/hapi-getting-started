'use strict';
import {find} from 'lodash';
import Bluebird from 'bluebird';
import moment from 'moment';
import Uuid from 'node-uuid';
import {UserNotFoundError, IncorrectPasswordError, UserNotLoggedInError,
    SessionCredentialsNotMatchingError, SessionExpiredError} from './../common/errors';
import {ip, secureHash, secureCompare, hasItems} from './../common/utils';
import {build} from './../common/dao';
import schemas from './schemas';
import Session from './session/model';
import Preferences from './preferences/model';
import Profile from './profile/model';
import Roles from './roles/model';
class Users {
    constructor(attrs) {
        this.init(attrs);
    }

    hasPermissionsTo(performAction, onObject) {
        return !!find(this._roles, role => role.hasPermissionsTo(performAction, onObject));
    }

    resetPasswordSent(by) {
        this.resetPwd = {
            token: Uuid.v4(),
            expires: Date.now() + 10000000
        };
        return this.trackChanges('reset password sent', null, this.resetPwd, by);
    }

    setPassword(newPassword, by) {
        if (newPassword) {
            const oldPassword = this.password;
            const newHashedPassword = secureHash(newPassword);
            this.password = newHashedPassword;
            delete this.resetPwd;
            this.trackChanges('reset password', oldPassword, newHashedPassword, by);
        }
        return this;
    }

    stripPrivateData() {
        return {
            email: this.email
        };
    }

    _populate() {
        return Roles.find({name: {$in: this.roles}, organisation: this.organisation})
            .then(roles => {
                this._roles = roles;
                return this;
            });
    }

    static newObject(doc) {
        const {email, password, organisation, locale} = doc.payload;
        const ipadrs = ip(doc);
        return Users.create(email, organisation, password, locale)
            .then(user => user.loginSuccess(ipadrs, user.email).save())
            .then(user => user.afterLogin(ipadrs));
    }

    static create(email, organisation, password, locale) {
        let document = {
            email,
            password: secureHash(password),
            organisation,
            roles: ['readonly'],
            session: [],
            preferences: Preferences.create(),
            profile: Profile.create()
        };
        document.preferences.locale = locale;
        return Users.insertAndAudit(document, email);
    }

    static findByCredentials(email, password) {
        return Users.findOne({email, isActive: true})
            .then(user => {
                if (!user) {
                    return Bluebird.reject(new UserNotFoundError({email}));
                }
                if (!secureCompare(password, user.password)) {
                    return Bluebird.reject(new IncorrectPasswordError({email}));
                }
                return user;
            });
    }

    static findBySessionCredentials(email, key) {
        return Users.findOne({email, isActive: true})
            .then(user => {
                if (!user) {
                    return Bluebird.reject(new UserNotFoundError({email}));
                }
                if (!hasItems(user.session)) {
                    return Bluebird.reject(new UserNotLoggedInError({email}));
                }
                const matchingSession = find(user.session, session => secureCompare(key, session.key));
                if (!matchingSession) {
                    return Bluebird.reject(new SessionCredentialsNotMatchingError({email}));
                }
                if (moment().isAfter(matchingSession.expires)) {
                    return Bluebird.reject(new SessionExpiredError({email}));
                }
                return user._populate();
            });
    }
}
build(Users, schemas.dao, schemas.model, [Session, Preferences, Profile], 'email');
export default Users;

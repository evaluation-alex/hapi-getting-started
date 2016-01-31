'use strict';
const find = require('./../lodash').find;
const Bluebird = require('bluebird');
const moment = require('moment');
const Uuid = require('node-uuid');
const errors = require('./../common/errors');
const {UserNotFoundError, IncorrectPasswordError, UserNotLoggedInError,
    SessionCredentialsNotMatchingError, SessionExpiredError} = errors ;
const utils = require('./../common/utils');
const {ip, secureHash, secureCompare, hasItems} = utils;
const build = require('./../common/dao').build;
const schemas = require('./schemas');
const Session = require('./../session/model');
const Preferences = require('./../preferences/model');
const Profile = require('./../profile/model');
const Roles = require('./../roles/model');
const Users = function Users(attrs) {
    this.init(attrs);
    return this;
};
Users.prototype = {
    hasPermissionsTo(performAction, onObject) {
        return !!find(this._roles, role => role.hasPermissionsTo(performAction, onObject));
    },
    resetPasswordSent(by) {
        this.resetPwd = {
            token: Uuid.v4(),
            expires: Date.now() + 10000000
        };
        return this.trackChanges('reset password sent', null, this.resetPwd, by);
    },
    setPassword(newPassword, by) {
        if (newPassword) {
            const oldPassword = this.password;
            const newHashedPassword = secureHash(newPassword);
            this.password = newHashedPassword;
            delete this.resetPwd;
            this.trackChanges('reset password', oldPassword, newHashedPassword, by);
        }
        return this;
    },
    populate() {
        return {
            email: this.email
        };
    },
    _populate() {
        return Roles.find({name: {$in: this.roles}, organisation: this.organisation})
            .then(roles => {
                this._roles = roles;
                return this;
            });
    }
};
Users.newObject = function newObject(doc) {
    const {email, password, organisation, locale} = doc.payload;
    const ipadrs = ip(doc);
    return Users.create(email, organisation, password, locale)
        .then(user => user.loginSuccess(ipadrs, user.email).save())
        .then(user => user.afterLogin(ipadrs));
};
Users.create = function create(email, organisation, password, locale) {
    return Users.insertAndAudit({
        email,
        password: secureHash(password),
        organisation,
        roles: ['readonly'],
        session: [],
        preferences: Preferences.create(locale),
        profile: Profile.create()
    }, email);
};
Users.findByCredentials = function findByCredentials(email, password) {
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
};
Users.findBySessionCredentials = function findBySessionCredentials(email, key) {
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
};
module.exports = build(Users, schemas.dao, schemas.model, [Session, Preferences, Profile], 'email');

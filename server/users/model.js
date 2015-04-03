'use strict';
let Model = require('./../common/model');
let Joi = require('joi');
let Uuid = require('node-uuid');
var Promise = require('bluebird');
let Insert = require('./../common/mixins/insert');
let AreValid = require('./../common/mixins/exist');
let Properties = require('./../common/mixins/properties');
let IsActive = require('./../common/mixins/is-active');
let AddRemove = require('./../common/mixins/add-remove');
let Update = require('./../common/mixins/update');
let Save = require('./../common/mixins/save');
let CAudit = require('./../common/mixins/audit');
let Session = require('./session/model');
let Preferences = require('./preferences/model');
let Profile = require('./profile/model');
let _ = require('lodash');
let errors = require('./../common/errors');
let utils = require('./../common/utils');
var Users = function Users (attrs) {
    _.assign(this, attrs);
    Object.defineProperty(this, '_roles', {
        writable: true,
        enumerable: false
    });
    Object.defineProperty(this, 'audit', {
        writable: true,
        enumerable: false
    });
};
Users.collection = 'users';
Users.schema = Joi.object().keys({
    _id: Joi.object(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    organisation: Joi.string().required(),
    roles: Joi.array().items(Joi.string()).unique(),
    resetPwd: Joi.object().keys({
        token: Joi.string().required(),
        expires: Joi.date().required()
    }),
    session: Session.schema,
    preferences: Preferences.schema,
    profile: Profile.schema,
    isActive: Joi.boolean().default(true),
    createdBy: Joi.string(),
    createdOn: Joi.date(),
    updatedBy: Joi.string(),
    updatedOn: Joi.date()
});
Users.indexes = [
    [{email: 1}, {unique: true}],
    [{email: 1, organisation: 1}, {unique: true}]
];
_.extend(Users, Model);
_.extend(Users, new Insert('email', 'signup'));
_.extend(Users, new AreValid('email'));
_.extend(Users, Session);
_.extend(Users, Preferences);
_.extend(Users, Profile);
_.extend(Users.prototype, new IsActive());
_.extend(Users.prototype, new Properties(['isActive', 'roles']));
_.extend(Users.prototype, new AddRemove(_.flatten(Preferences.arrprops, Profile.arrprops)));
_.extend(Users.prototype, Session.prototype);
_.extend(Users.prototype, Preferences.prototype);
_.extend(Users.prototype, Profile.prototype);
_.extend(Users.prototype, new Update([
    'isActive',
    'roles',
    'password'
], [], 'updateUser'));
_.extend(Users.prototype, new Save(Users));
_.extend(Users.prototype, new CAudit(Users.collection, 'email'));
Users.prototype.hasPermissionsTo = function hasPermissionsTo (performAction, onObject) {
    let self = this;
    return !!_.find(self._roles, function (role) {
        return role.hasPermissionsTo(performAction, onObject);
    });
};
Users.prototype.resetPasswordSent = function resetPasswordSent (by) {
    let self = this;
    self.resetPwd = {
        token: Uuid.v4(),
        expires: Date.now() + 10000000
    };
    return self.trackChanges('reset password sent', null, self.resetPwd, by);
};
Users.prototype.setPassword = function setPassword (newPassword, by) {
    let self = this;
    if (newPassword) {
        let oldPassword = self.password;
        let newHashedPassword = utils.secureHash(newPassword);
        self.password = newHashedPassword;
        delete self.resetPwd;
        self.trackChanges('reset password', oldPassword, newHashedPassword, by);
    }
    return self;
};
Users.prototype.stripPrivateData = function stripData () {
    let self = this;
    return {
        email: self.email
    };
};
Users.prototype.afterLogin = function afterLogin (ipaddress) {
    let self = this;
    let session = _.find(self.session, function (session) {
        return session.ipaddress === ipaddress;
    });
    return {
        user: self.email,
        session: session,
        authHeader: 'Basic ' + new Buffer(self.email + ':' + session.key).toString('base64'),
        preferences: self.preferences
    };
};
Users.create = function create (email, organisation, password, locale) {
    let self = this;
    let document = {
        email: email,
        password: utils.secureHash(password),
        organisation: organisation,
        roles: ['readonly'],
        session: [],
        preferences: Preferences.create(),
        profile: Profile.create(),
        isActive: true,
        createdBy: email,
        createdOn: new Date(),
        updatedBy: email,
        updatedOn: new Date()
    };
    document.preferences.locale = locale;
    return self.insertAndAudit(document);
};
Users.findByCredentials = function findByCredentials (email, password) {
    let self = this;
    return self.findOne({email: email, isActive: true})
        .then(function (user) {
            if (!user) {
                return Promise.reject(new errors.UserNotFoundError({email: email}));
            }
            var passwordMatch = utils.secureCompare(password, user.password);
            if (!passwordMatch) {
                return Promise.reject(new errors.IncorrectPasswordError({email: email}));
            }
            return user;
        });
};
module.exports = Users;

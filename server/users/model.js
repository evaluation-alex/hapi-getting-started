'use strict';
let ModelBuilder = require('./../common/model-builder');
let schemas = require('./schemas');
let Uuid = require('node-uuid');
let Bluebird = require('bluebird');
let Session = require('./session/model');
let Preferences = require('./preferences/model');
let Profile = require('./profile/model');
let _ = require('lodash');
let errors = require('./../common/errors');
let utils = require('./../common/utils');
let Users = (new ModelBuilder())
    .onModel(function Users (attrs) {
        _.assign(this, attrs);
        Object.defineProperty(this, '_roles', {
            writable: true,
            enumerable: false
        });
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    })
    .extendVirtualModel(Session)
    .extendVirtualModel(Preferences)
    .extendVirtualModel(Profile)
    .inMongoCollection('users')
    .usingConnection('app')
    .usingSchema(schemas.model)
    .addIndex([{email: 1}, {unique: true}])
    .addIndex([{email: 1, organisation: 1}, {unique: true}])
    .decorateWithInsertAndAudit('email', 'signup')
    .decorateWithSoftDeletes()
    .decorateWithUpdates([
        'isActive',
        'roles',
        'password'
    ], [], 'updateUser')
    .decorateWithSave()
    .decorateWithTrackChanges('email')
    .decorateWithAreValidQuery('email')
    .doneConfiguring();
Users.prototype.hasPermissionsTo = (performAction, onObject) => {
    let self = this;
    return !!_.find(self._roles, (role) => role.hasPermissionsTo(performAction, onObject));
};
Users.prototype.resetPasswordSent = (by) => {
    let self = this;
    self.resetPwd = {
        token: Uuid.v4(),
        expires: Date.now() + 10000000
    };
    return self.trackChanges('reset password sent', null, self.resetPwd, by);
};
Users.prototype.setPassword = (newPassword, by) => {
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
Users.prototype.stripPrivateData = () => {
    let self = this;
    return {
        email: self.email
    };
};
Users.prototype.afterLogin = (ipaddress) => {
    let self = this;
    let session = _.find(self.session, (sesion) => sesion.ipaddress === ipaddress);
    return {
        _id: self._id,
        user: self.email,
        session: session,
        authHeader: 'Basic ' + new Buffer(self.email + ':' + session.key).toString('base64'),
        preferences: self.preferences
    };
};
Users.create = (email, organisation, password, locale) => {
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
Users.findByCredentials = (email, password) => {
    let self = this;
    return self.findOne({email: email, isActive: true})
        .then((user) => {
            if (!user) {
                return Bluebird.reject(new errors.UserNotFoundError({email: email}));
            }
            if (!utils.secureCompare(password, user.password)) {
                return Bluebird.reject(new errors.IncorrectPasswordError({email: email}));
            }
            return user;
        });
};
module.exports = Users;

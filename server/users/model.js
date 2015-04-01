'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Joi = require('joi');
var Uuid = require('node-uuid');
var Promise = require('bluebird');
var promisify = require('./../common/mixins/promisify');
var Insert = require('./../common/mixins/insert');
var AreValid = require('./../common/mixins/exist');
var Properties = require('./../common/mixins/properties');
var IsActive = require('./../common/mixins/is-active');
var AddRemove = require('./../common/mixins/add-remove');
var Update = require('./../common/mixins/update');
var Save = require('./../common/mixins/save');
var CAudit = require('./../common/mixins/audit');
var Session = require('./session/model');
var Preferences = require('./preferences/model');
var Profile = require('./profile/model');
var _ = require('lodash');
var errors = require('./../common/errors');
var utils = require('./../common/utils');
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

Users._collection = 'users';

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

_.extend(Users, BaseModel);
promisify(Users, ['find', 'findOne', 'pagedFind', 'findOneAndReplace', 'insertOne']);
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
], [
], 'updateUser'));
_.extend(Users.prototype, new Save(Users));
_.extend(Users.prototype, new CAudit(Users._collection, 'email'));

Users.prototype.hasPermissionsTo = function hasPermissionsTo (performAction, onObject) {
    var self = this;
    return !!_.find(self._roles, function (role) {
        return role.hasPermissionsTo(performAction, onObject);
    });
};

Users.prototype.resetPasswordSent = function resetPasswordSent (by) {
    var self = this;
    self.resetPwd = {
        token: Uuid.v4(),
        expires: Date.now() + 10000000
    };
    return self.trackChanges('reset password sent', null, self.resetPwd, by);
};

Users.prototype.setPassword = function setPassword (newPassword, by) {
    var self = this;
    if (newPassword) {
        var oldPassword = self.password;
        var newHashedPassword = utils.secureHash(newPassword);
        self.password = newHashedPassword;
        delete self.resetPwd;
        self.trackChanges('reset password', oldPassword, newHashedPassword, by);
    }
    return self;
};

Users.prototype.stripPrivateData = function stripData () {
    var self = this;
    return {
        email: self.email
    };
};

Users.prototype.afterLogin = function afterLogin (ipaddress) {
    var self = this;
    var session = _.find(self.session, function (session) {
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
    var self = this;
    var hash = utils.secureHash(password);
    var document = {
        email: email,
        password: hash,
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
    var self = this;
    return self._findOne({email: email, isActive: true})
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

'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var ObjectAssign = require('object-assign');
var Joi = require('joi');
var Uuid = require('node-uuid');
var Promise = require('bluebird');
var Promisify = require('./../common/mixins/promisify');
var Insert = require('./../common/mixins/insert');
var AreValid = require('./../common/mixins/exist');
var Properties = require('./../common/mixins/properties');
var IsActive = require('./../common/mixins/is-active');
var Save = require('./../common/mixins/save');
var CAudit = require('./../common/mixins/audit');
var Session = require('./session/model');
var Preferences = require('./preferences/model');
var _ = require('lodash');
var errors = require('./../common/errors');
var utils = require('./../common/utils');

var Users = BaseModel.extend({
    /* jshint -W064 */
    constructor: function user (attrs) {
        ObjectAssign(this, attrs);
        Object.defineProperty(this, '_roles', {
            writable: true,
            enumerable: false
        });
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    }
    /* jshint +W064 */
});

Users._collection = 'users';

Promisify(Users, ['find', 'findOne', 'pagedFind', 'findByIdAndUpdate', 'insert']);
_.extend(Users, new Insert('email', 'signup'));
_.extend(Users, new AreValid('email'));
_.extend(Users, Session);
_.extend(Users, Preferences);
_.extend(Users.prototype, new IsActive());
_.extend(Users.prototype, new Properties(['isActive', 'roles']));
_.extend(Users.prototype, new Save(Users));
_.extend(Users.prototype, new CAudit(Users._collection, 'email'));
_.extend(Users.prototype, Session.prototype);
_.extend(Users.prototype, Preferences.prototype);

Users.prototype.hasPermissionsTo = function hasPermissionsTo (performAction, onObject) {
    var self = this;
    var ret = !!_.find(self._roles, function (role) {
        return role.hasPermissionsTo(performAction, onObject);
    });
    return ret;
};
Users.prototype.resetPasswordSent = function resetPasswordSent (by) {
    var self = this;
    self.resetPwd = {
        token: Uuid.v4(),
        expires: Date.now() + 10000000
    };
    return self._audit('reset password sent', null, self.resetPwd, by);
};
Users.prototype.setPassword = function setPassword (newPassword, by) {
    var self = this;
    if (newPassword) {
        var oldPassword = self.password;
        var newHashedPassword = utils.secureHash(newPassword);
        self.password = newHashedPassword;
        delete self.resetPwd;
        self._audit('reset password', oldPassword, newHashedPassword, by);
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
Users.prototype.updateUser = function update (doc, by) {
    var self = this;
    return self.setIsActive(doc.payload.isActive, by)
        .setRoles(doc.payload.roles, by)
        .setPassword(doc.payload.password, by);
};

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

Users.create = function create (email, organisation, password, locale) {
    var self = this;
    var hash = utils.secureHash(password);
    var document = {
        email: email,
        password: hash,
        organisation: organisation,
        roles: ['readonly'],
        session: [],
        preferences: {
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
            locale: locale
        },
        isActive: true,
        createdBy: email,
        createdOn: new Date(),
        updatedBy: email,
        updatedOn: new Date()
    };
    return self._insertAndAudit(document);
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


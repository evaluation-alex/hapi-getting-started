'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var ObjectAssign = require('object-assign');
var Joi = require('joi');
var Uuid = require('node-uuid');
var Bcrypt = require('bcrypt');
var Promisify = require('./../common/mixins/promisify');
var Insert = require('./../common/mixins/insert');
var AreValid = require('./../common/mixins/exist');
var Properties = require('./../common/mixins/properties');
var IsActive = require('./../common/mixins/is-active');
var Save = require('./../common/mixins/save');
var CAudit = require('./../common/mixins/audit');
var Roles = require('./../roles/model');
var _ = require('lodash');

var Users = BaseModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
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
Promisify(Users, ['find', 'findOne', 'pagedFind', 'findByIdAndUpdate', 'insert']);
_.extend(Users, new Insert('email', 'signup'));
_.extend(Users, new AreValid('email'));
_.extend(Users.prototype, new IsActive());
_.extend(Users.prototype, new Properties(['isActive', 'roles']));
_.extend(Users.prototype, new Save(Users));
_.extend(Users.prototype, new CAudit('Users', 'email'));

Users.prototype.hasPermissionsTo = function (performAction, onObject) {
    var self = this;
    var ret = !!_.find(self._roles, function (role) {
        return role.hasPermissionsTo(performAction, onObject);
    });
    return ret;
};
Users.prototype.hydrateRoles = function () {
    var self = this;
    if (self._roles || !self.roles || self.roles.length === 0) {
        return Promise.resolve(self);
    } else {
        return Roles._find({name: {$in: self.roles}, organisation: self.organisation})
            .then(function (roles) {
                self._roles = roles;
                return self;
            });
    }
};
Users.prototype._invalidateSession = function () {
    var self = this;
    self.session = {};
    delete self.session;
    return self;
};
Users.prototype._newSession = function () {
    var self = this;
    self.session = {
        key: Bcrypt.hashSync(Uuid.v4().toString(), 10),
        timestamp: new Date()
    };
    return self;
};
Users.prototype.loginSuccess = function (ipaddress, by) {
    var self = this;
    self._newSession();
    delete self.resetPwd;
    return self._audit('login success', null, ipaddress, by);
};
Users.prototype.loginFail = function (ipaddress, by) {
    var self = this;
    self._invalidateSession();
    return self._audit('login fail', null, ipaddress, by);
};
Users.prototype.logout = function (ipaddress, by) {
    var self = this;
    self._invalidateSession();
    return self._audit('logout', null, ipaddress, by);
};
Users.prototype.resetPasswordSent = function (by) {
    var self = this;
    self.resetPwd = {
        token: Uuid.v4(),
        expires: Date.now() + 10000000
    };
    return self._audit('reset password sent', null, self.resetPwd, by);
};
Users.prototype.resetPassword = function (newPassword, by) {
    var self = this;
    if (newPassword) {
        var oldPassword = self.password;
        var newHashedPassword = Bcrypt.hashSync(newPassword, 10);
        self.password = newHashedPassword;
        delete self.resetPwd;
        self._audit('reset password', oldPassword, newHashedPassword, by);
    }
    return self;
};
Users.prototype.update = function (doc, by) {
    var self = this;
    return self._invalidateSession()
        .setIsActive(doc.payload.isActive, by)
        .setRoles(doc.payload.roles, by)
        .resetPassword(doc.payload.password, by);
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
    session: Joi.object().keys({
        key: Joi.object(),
        timestamp: Joi.date()
    }),
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

Users.create = function (email, password, organisation) {
    var self = this;
    var hash = Bcrypt.hashSync(password, 10);
    var document = {
        email: email,
        password: hash,
        organisation: organisation,
        roles: ['readonly'],
        session: {},
        isActive: true,
        createdBy: email,
        createdOn: new Date(),
        updatedBy: email,
        updatedOn: new Date()
    };
    return self._insertAndAudit(document);
};

Users.findByCredentials = function (email, password) {
    var self = this;
    return self._findOne({email: email, isActive: true})
        .then(function (user) {
            if (!user) {
                var err = new Error('User ' + email + ' NotFound');
                err.type = 'UserNotFoundError';
                throw err;
            } else {
                var passwordMatch = Bcrypt.compareSync(password, user.password);
                if (passwordMatch) {
                    return user;
                } else {
                    var err2 = new Error('IncorrectPasswordError');
                    err2.type = 'IncorrectPasswordError';
                    err2.user = user;
                    throw err2;
                }
            }
        });
};

Users.findBySessionCredentials = function (email, key) {
    var self = this;
    return self._findOne({email: email, isActive: true})
        .then(function (user) {
            if (!user || !user.session || !user.session.key) {
                throw new Error('User not found or not logged in');
            } else {
                var keyMatch = Bcrypt.compareSync(key, user.session.key) || key === user.session.key;
                if (keyMatch) {
                    return user.hydrateRoles();
                } else {
                    throw new Error('Session credentials do not match');
                }
            }
        });
};

module.exports = Users;


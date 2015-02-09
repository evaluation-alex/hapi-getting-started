'use strict';
var Joi = require('joi');
var Uuid = require('node-uuid');
var Bcrypt = require('bcrypt');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var IsActive = require('./../common/extended-model').IsActive;
var Save = require('./../common/extended-model').Save;
var CAudit = require('./../common/extended-model').Audit;
var Roles = require('./../roles/model');
var Audit = require('./../audit/model');
var Promise = require('bluebird');
var _ = require('lodash');

var Users = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
        Object.defineProperty(this, '_roles', {
            writable: true,
            enumerable: false
        });
    }
    /* jshint +W064 */
});

_.extend(Users.prototype, IsActive);
_.extend(Users.prototype, new Save(Users, Audit));
_.extend(Users.prototype, new CAudit('Users', 'email'));

Users.prototype.hasPermissionsTo = function (performAction, onObject) {
    var ret = false;
    if (this._roles) {
        this._roles.forEach(function (role) {
            ret = ret || role.hasPermissionsTo(performAction, onObject);
        });
    }
    return ret;
};
Users.prototype.hydrateRoles = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self._roles || !self.roles) {
            resolve(self);
        } else {
            Roles.findByName(self.roles)
                .then(function (roles) {
                    self._roles = roles;
                    resolve(self);
                })
                .catch(function (err) {
                    if (err) {
                        reject(err);
                    }
                })
                .done();
        }
    });
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
        key: Bcrypt.hashSync(Uuid.v4(), 10),
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
    var oldPassword = self.password;
    var newHashedPassword = Bcrypt.hashSync(newPassword, 10);
    self.password = newHashedPassword;
    delete self.resetPwd;
    return self._audit('reset password', oldPassword, newHashedPassword, by);
};
Users.prototype.updateRoles = function (newRoles, by) {
    var self = this;
    if (!_.isEqual(self.roles, newRoles)) {
        var oldRoles = self.roles;
        self.roles = newRoles;
        self._audit('update roles', oldRoles, newRoles, by);
    }
    return self;
};

Users._collection = 'users';

Users.schema = Joi.object().keys({
    _id: Joi.object(),
    email: Joi.string().email().required(),
    password: Joi.string(),
    roles: Joi.array().includes(Joi.string()),
    resetPwd: Joi.object().keys({
        token: Joi.string().required(),
        expires: Joi.date().required()
    }),
    isActive: Joi.boolean().default(true),
    session: Joi.object().keys({
        key: Joi.object(),
        timestamp: Joi.date()
    })
});

Users.indexes = [
    [{email: 1}, {unique: true}]
];

Users.create = function (email, password) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var hash = Bcrypt.hashSync(password, 10);
        var document = {
            email: email,
            password: hash,
            roles: ['readonly'],
            isActive: true,
            session: {}
        };
        self._insert(document, false)
            .then(function (user) {
                if (user) {
                    Audit.create('Users', email, 'signup', null, user, email);
                }
                resolve(user);
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            });
    });
};

Users.findByEmail = function (email) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._findOne({email: email})
            .then(function (obj) {
                if (!obj) {
                    resolve(false);
                } else {
                    resolve(obj);
                }
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            });
    });
};

Users.findByCredentials = function (email, password) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._findOne({email: email, isActive: true})
            .then(function (user) {
                if (!user) {
                    resolve(false);
                } else {
                    var passwordMatch = Bcrypt.compareSync(password, user.password);
                    if (passwordMatch) {
                        resolve(user);
                    } else {
                        resolve({fail: true, user: user});
                    }
                }
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            });
    });
};

Users.findBySessionCredentials = function (email, key) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._findOne({email: email})
            .then(function (user) {
                if (!user) {
                    resolve(false);
                } else {
                    if (!user.session || !user.session.key) {
                        resolve(false);
                    } else {
                        var keyMatch = Bcrypt.compareSync(key, user.session.key) || key === user.session.key;
                        if (keyMatch) {
                            resolve(user);
                        } else {
                            resolve(false);
                        }
                    }
                }
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            });
    });
};

module.exports = Users;


'use strict';
var Joi = require('joi');
var Uuid = require('node-uuid');
var Bcrypt = require('bcrypt');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
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
Users.prototype._audit = function (action, oldValues, newValues, by) {
    var self = this;
    return Audit.createUsersAudit(self.email, action, oldValues, newValues, by);
};
Users.prototype._invalidateSession = function () {
    var self = this;
    self.session = {};
    delete self.session;
};
Users.prototype._newSession = function () {
    var self = this;
    self.session = {
        key: Bcrypt.hashSync(Uuid.v4(), 10),
        timestamp: new Date()
    };
};
Users.prototype.signup = function (by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._invalidateSession();
        self._audit('signup', '', self.email + '##' + self.password, by);
        resolve(self);
    });
};
Users.prototype.loginSuccess = function (ipaddress, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._invalidateSession();
        self._audit('login success', '', ipaddress, by);
        self._newSession();
        self.resetPwd = {};
        resolve(Users._findByIdAndUpdate(self._id, self));
    });
};
Users.prototype.loginFail = function (ipaddress, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._invalidateSession();
        self._audit('login fail', '', ipaddress, by);
        resolve(Users._findByIdAndUpdate(self._id, self));
    });
};
Users.prototype.logout = function (ipaddress, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._invalidateSession();
        self._audit('logout', '', ipaddress, by);
        resolve(Users._findByIdAndUpdate(self._id, self));
    });
};
Users.prototype.resetPasswordSent = function (by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.resetPwd = {
            token: Uuid.v4(),
            expires: Date.now() + 10000000
        };
        self._audit('reset password sent', '', self.resetPwd, by);
        resolve(Users._findByIdAndUpdate(self._id, self));
    });
};
Users.prototype.resetPassword = function (newPassword, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._invalidateSession();
        var newHashedPassword = Bcrypt.hashSync(newPassword, 10);
        self._audit('reset password', self.password, newHashedPassword, by);
        self.password = newHashedPassword;
        self.resetPwd = {};
        resolve(Users._findByIdAndUpdate(self._id, self));
    });
};
Users.prototype.updateRoles = function (newRoles, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (!_.isEqual(self.roles, newRoles)) {
            self._audit('update roles', self.roles, newRoles, by);
            self.roles = newRoles;
            self._invalidateSession();
            resolve(Users._findByIdAndUpdate(self._id, self));
        } else {
            resolve(self);
        }
    });
};
Users.prototype.deactivate = function (by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self.isActive) {
            self._audit('deactivate', true, false, by);
            self.isActive = false;
            self._invalidateSession();
            resolve(Users._findByIdAndUpdate(self._id, self));
        } else {
            resolve(self);
        }
    });
};
Users.prototype.reactivate = function (by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (!self.isActive) {
            self._audit('reactivate', false, true, by);
            self.isActive = true;
            self._invalidateSession();
            resolve(Users._findByIdAndUpdate(self._id, self));
        } else {
            resolve(self);
        }
    });
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
    var hash = Bcrypt.hashSync(password, 10);
    var document = {
        email: email,
        password: hash,
        roles: ['readonly'],
        isActive: true,
        session: {}
    };
    return self._insert(document, false);
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

Users.areValid = function (emails) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (!emails || emails.length === 0) {
            resolve({});
        } else {
            self._find({email: {$in: emails}, isActive: true})
                .then(function (docs) {
                    if (!docs) {
                        resolve({});
                    } else {
                        var results = Object.create(null);
                        _.forEach(docs, function (doc) {
                            results[doc.email] = true;
                        });
                        _.forEach(emails, function (e) {
                            if (!results[e]) {
                                results[e] = false;
                            }
                        });
                        resolve(results);
                    }
                })
                .catch(function (err) {
                    if (err) {
                        reject(err);
                    }
                });
        }
    });
};

module.exports = Users;


'use strict';
var Joi = require('joi');
var Uuid = require('node-uuid');
var Bcrypt = require('bcrypt');
var ObjectAssign = require('object-assign');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Roles = require('./roles');
var UsersAudit = require('./users-audit');
var Promise = require('bluebird');

var Users = BaseModel.extend({
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
        Object.defineProperty(this, '_roles', {
            writable: true,
            enumerable: false
        });
    },
    hasPermissionsTo: function (performAction, onObject) {
        var ret = false;
        if (this._roles) {
            this._roles.forEach(function (role) {
                ret = ret || role.hasPermissionsTo(performAction, onObject);
            });
        }
        return ret;
    },
    hydrateRoles: function () {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            if (!self.roles) {
                self._roles = {};
                resolve(self);
            } else if (self._roles) {
                resolve(self);
            } else if (self.roles) {
                Roles.findByName(self.roles)
                    .then(function (roles) {
                        self._roles = roles;
                        resolve(self);
                    })
                    .catch(function (err) {
                        reject(err);
                    })
                    .done();
            }
        });
        return promise;
    },
    _audit: function (action, attribs, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            UsersAudit.create({
                userId: self.email,
                action: action,
                attribs: attribs,
                timestamp: new Date(),
                by: by
            })
                .then(function (userAudit) {
                    resolve(self);
                })
                .catch(function (err) {
                    if (err) {
                        reject(err);
                    }
                }).done();
        });
        return promise;
    },
    _invalidateSession: function () {
        var self = this;
        self.session = {};
        delete self.session;
    },
    _newSession: function () {
        var self = this;
        self.session = {
            key: Bcrypt.hashSync(Uuid.v4(), 10),
            timestamp: new Date()
        };
    },
    signup: function (by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self._invalidateSession();
            resolve(self._audit('signup', self.email + '##' + self.password), by);
        });
        return promise;
    },
    loginSuccess: function (ipaddress, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self._invalidateSession();
            self._audit('login success', ipaddress, by);
            self._newSession();
            self.resetPwd = {};
            resolve(Users._findByIdAndUpdate(self._id, self));
        });
        return promise;
    },
    loginFail: function (ipaddress, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self._invalidateSession();
            self._audit('login fail', ipaddress, by);
            resolve(Users._findByIdAndUpdate(self._id, self));
        });
        return promise;
    },
    logout: function (ipaddress, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self._invalidateSession();
            self._audit('logout', ipaddress, by);
            resolve(Users._findByIdAndUpdate(self._id, self));
        });
        return promise;
    },
    resetPasswordSent: function (by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self.resetPwd = {
                token: Uuid.v4(),
                expires: Date.now() + 10000000
            };
            self._audit('reset password sent', self.resetPwd.token, by);
            resolve(Users._findByIdAndUpdate(self._id, self));
        });
        return promise;
    },
    resetPassword: function (newPassword, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self._invalidateSession();
            self._audit('reset password', self.password, by);
            self.password = Bcrypt.hashSync(newPassword, 10);
            self.resetPwd = {};
            resolve(Users._findByIdAndUpdate(self._id, self));
        });
        return promise;
    },
    updateRoles: function (newRoles, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self._audit('update roles', self.roles, by);
            self.roles = newRoles;
            self._invalidateSession();
            resolve(Users._findByIdAndUpdate(self._id, self));
        });
        return promise;
    },
    deactivate: function (by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self._audit('deactivate', self.isActive, by);
            self.isActive = false;
            self._invalidateSession();
            resolve(Users._findByIdAndUpdate(self._id, self));
        });
        return promise;
    },
    reactivate: function (by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            self._audit('reactivate', self.isActive, by);
            self.isActive = true;
            self._invalidateSession();
            resolve(Users._findByIdAndUpdate(self._id, self));
        });
        return promise;
    }
});

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
    var promise = new Promise(function (resolve, reject) {
        var hash = Bcrypt.hashSync(password, 10);
        var document = {
            email: email,
            password: hash,
            roles: ['readonly'],
            isActive: true,
            session: {}
        };
        self.insert(document, function (err, results) {
            if (err) {
                reject(err);
            } else {
                if (!results) {
                    resolve(false);
                } else {
                    resolve(results[0]);
                }
            }
        });
    });
    return promise;
};

Users.findByCredentials = function (email, password) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.findOne({email: email, isActive: true}, function (err, user) {
            if (err) {
                reject(err);
            } else {
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
            }
        });
    });
    return promise;
};

Users.findBySessionCredentials = function (email, key) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.findOne({email: email}, function (err, user) {
            if (err) {
                reject(err);
            } else {
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
            }
        });
    });
    return promise;
};

Users.findByEmail = function (email) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.findOne({email: email}, function (err, obj) {
            if (err) {
                reject(err);
            } else {
                if (!obj) {
                    resolve(false);
                } else {
                    resolve(obj);
                }
            }
        });
    });
    return promise;
};

Users._findByIdAndUpdate = function (id, obj) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.findByIdAndUpdate(id, obj, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                resolve(obj);
            }
        });
    });
    return promise;
};

Users._findOne = function (conditions) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.findOne(conditions, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                resolve(doc);
            }
        });
    });
    return promise;
};

module.exports = Users;


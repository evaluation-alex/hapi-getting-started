'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Promise = require('bluebird');
var Audit = require('./audit');
var UserGroups = require('./user-groups');
var _ = require('lodash');

var Permissions = BaseModel.extend({
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    },
    _audit: function (action, oldValues, newValues, by) {
        var self = this;
        return Audit.createPermissionsAudit(self._id, action, oldValues, newValues, by);
    },
    isPermissionFor: function (forAction, onObject) {
        var self = this;
        var ret = (self.action === forAction || self.action === '*') &&
            (self.object === onObject || self.object === '*');

        return ret;
    },
    addUsers: function (toAdd, userType, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            var modified = false;
            toAdd.forEach(function (userToAdd) {
                var found = _.findWhere(self.users, {user: userToAdd});
                if (found) {
                    if (!found.isActive) {
                        modified = true;
                        found.isActive = true;
                        self._audit('add user users.' + userToAdd + 'isActive', false, true, by);
                    }
                } else {
                    modified = true;
                    self.users.push({user: userToAdd, type: userType, isActive: true});
                    self._audit('add user', '', userToAdd, by);
                }
            });
            if (modified) {
                resolve(Permissions._findByIdAndUpdate(self._id, self));
            } else {
                resolve(self);
            }
        });
        return promise;
    },
    removeUsers: function (toRemove, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            var modified = false;
            toRemove.forEach(function (userToRemove) {
                var found = _.findWhere(self.users, {user: userToRemove});
                if (found) {
                    if (found.isActive) {
                        modified = true;
                        found.isActive = false;
                        self._audit('remove user users.' + userToRemove + '.isActive', true, false, by);
                    }
                }
            });
            if (modified) {
                resolve(Permissions._findByIdAndUpdate(self._id, self));
            } else {
                resolve(self);
            }
        });
        return promise;
    },
    deactivate: function (by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            if (self.isActive) {
                self._audit('isActive', true, false, by);
                self.isActive = false;
                resolve(Permissions._findByIdAndUpdate(self._id, self));
            } else {
                resolve(self);
            }
        });
        return promise;
    },
    reactivate: function (by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            if (!self.isActive) {
                self._audit('isActive', false, true, by);
                self.isActive = true;
                resolve(Permissions._findByIdAndUpdate(self._id, self));
            } else {
                resolve(self);
            }
        });
        return promise;
    },
    updateDesc: function (newDesc, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            if (self.description !== newDesc) {
                self._audit('change desc', self.description, newDesc, by);
                self.description = newDesc;
                resolve(Permissions._findByIdAndUpdate(self._id, self));
            } else {
                resolve(self);
            }
        });
        return promise;
    }
});

Permissions._collection = 'permissions';

Permissions.schema = Joi.object().keys({
    _id: Joi.object(),
    description: Joi.string(),
    users: Joi.array().includes(Joi.object().keys({
        user: Joi.string(),
        type: Joi.string().valid('user', 'group'),
        isActive: Joi.boolean().default(true)
    })),
    action: Joi.string(),
    object: Joi.string(),
    isActive: Joi.boolean().default(true)
});

Permissions.indexes = [
    [{'users.user': 1, 'users.isActive': 1}],
    [{'action': 1, 'object': 1}, {unique: true}],
];

Permissions.create = function (description, users, action, object, by) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        var document = {
            description: description,
            users: users,
            action: action,
            object: object,
            isActive: true
        };
        self.insert(document, function (err, results) {
            if (err) {
                reject(err);
            } else {
                if (!results) {
                    resolve({});
                } else {
                    Audit.createPermissionsAudit(results[0]._id, 'create', '', results[0], by);
                    resolve(results[0]);
                }
            }
        });
    });
    return promise;
};

Permissions.findByDescription = function (description) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.find({description: {$regex: new RegExp(description)}, isActive: true}, function (err, permissions) {
            if (err) {
                reject(err);
            } else {
                if (!permissions) {
                    resolve([]);
                } else {
                    resolve(permissions);
                }
            }
        });
    });
    return promise;
};

Permissions.findAllPermissionsForUser = function (email) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        UserGroups.findGroupsForUser(email)
            .then(function (userGroups) {
                var ug = userGroups.map(function (userGroup) {
                    return userGroup.name;
                });
                ug.push(email);
                var conditions = {
                    'users.user': {$in: ug},
                    'users.isActive': true
                };
                self.find(conditions, function (err, permissions) {
                    if (err) {
                        reject(err);
                    } else {
                        if (!permissions) {
                            resolve([]);
                        } else {
                            resolve(permissions);
                        }
                    }
                });
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            })
            .done();
    });
    return promise;
};

Permissions.isPermitted = function (user, action, object) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        if (user === 'root') { //root is god
            resolve(true);
        } else {
            self.findAllPermissionsForUser(user)
                .then(function (permissions) {
                    var ret = false;
                    var len = permissions.length;
                    for (var i = 0; i < len && !ret; i++) {
                        ret = ret || permissions[i].isPermissionFor(action, object);
                    }
                    resolve(ret);
                })
                .catch(function (err) {
                    if (err) {
                        reject(err);
                    }
                })
                .done();
        }
    });
    return promise;
};

Permissions._findByIdAndUpdate = function (id, obj) {
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

Permissions._findOne = function (conditions) {
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

module.exports = Permissions;


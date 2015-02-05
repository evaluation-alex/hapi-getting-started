'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var Promise = require('bluebird');
var Audit = require('./../audit/model');
var UserGroups = require('./../user-groups/model');
var _ = require('lodash');

var Permissions = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});
Permissions.prototype._audit = function (action, oldValues, newValues, by) {
    var self = this;
    return Audit.createPermissionsAudit(self._id, action, oldValues, newValues, by);
};
Permissions.prototype.isPermissionFor = function (forAction, onObject) {
    var self = this;
    var ret = (self.action === forAction || self.action === '*') &&
        (self.object === onObject || self.object === '*');

    return ret;
};
Permissions.prototype._find = function (role, toFind) {
    var self = this;
    return _.findWhere(self[role], toFind);
};
Permissions.prototype._add = function (toAdd, role, by) {
    var self = this;
    var modified = false;
    _.forEach(toAdd, function (memberToAdd) {
        var found = self._find(role, memberToAdd);
        if (!found) {
            modified = true;
            self[role].push(memberToAdd);
            self._audit('add ' + role, null, memberToAdd, by);
        }
    });
    return modified;
};
Permissions.prototype.addUsers = function (toAdd, role, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var modified = toAdd && (role.indexOf('user') !== -1) && self._add(toAdd, 'users', by);
        var modified2 = toAdd && (role.indexOf('group') !== -1) && self._add(toAdd, 'groups', by);
        resolve(modified || modified2 ? Permissions._findByIdAndUpdate(self._id, self) : self);
    });
};
Permissions.prototype._remove = function (toRemove, role, by) {
    var self = this;
    var modified = false;
    _.forEach(toRemove, function (memberToRemove) {
        var found = _.remove(self[role], function (m) {
            return m === memberToRemove;
        });
        if (found && found.length > 0) {
            modified = true;
            self._audit('remove ' + role, memberToRemove, null, by);
        }
    });
    return modified;
};
Permissions.prototype.removeUsers = function (toRemove, role, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var modified = toRemove && (role.indexOf('user') !== -1) && self._remove(toRemove, 'users', by);
        var modified2 = toRemove && (role.indexOf('group') !== -1) && self._remove(toRemove, 'groups', by);
        resolve(modified || modified2 ? Permissions._findByIdAndUpdate(self._id, self) : self);
    });
};
Permissions.prototype.deactivate = function (by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self.isActive) {
            self._audit('isActive', true, false, by);
            self.isActive = false;
            resolve(Permissions._findByIdAndUpdate(self._id, self));
        } else {
            resolve(self);
        }
    });
};
Permissions.prototype.reactivate = function (by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (!self.isActive) {
            self._audit('isActive', false, true, by);
            self.isActive = true;
            resolve(Permissions._findByIdAndUpdate(self._id, self));
        } else {
            resolve(self);
        }
    });
};
Permissions.prototype.updateDesc = function (newDesc, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self.description !== newDesc) {
            self._audit('change desc', self.description, newDesc, by);
            self.description = newDesc;
            resolve(Permissions._findByIdAndUpdate(self._id, self));
        } else {
            resolve(self);
        }
    });
};

Permissions._collection = 'permissions';

Permissions.schema = Joi.object().keys({
    _id: Joi.object(),
    description: Joi.string(),
    users: Joi.array().includes(Joi.string()).unique(),
    groups: Joi.array().includes(Joi.string()).unique(),
    action: Joi.string(),
    object: Joi.string(),
    isActive: Joi.boolean().default(true)
});

Permissions.indexes = [
    [{'users': 1}],
    [{'groups': 1}],
    [{'action': 1, 'object': 1}, {unique: true}]
];

Permissions.create = function (description, users, groups, action, object, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var document = {
            description: description,
            users: users,
            groups: groups,
            action: action,
            object: object,
            isActive: true
        };
        self._insert(document, {})
            .then(function (doc) {
                Audit.createPermissionsAudit(doc._id, 'create', '', doc, by);
                resolve(doc);
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            })
            .done();
    });
};

Permissions.findByDescription = function (description) {
    var self = this;
    return self._find({description: {$regex: new RegExp(description)}, isActive: true});
};

Permissions.findAllPermissionsForUser = function (email) {
    var self = this;
    return new Promise(function (resolve, reject) {
        UserGroups.findGroupsForUser(email)
            .then(function (userGroups) {
                var ug = userGroups.map(function (userGroup) {
                    return userGroup.name;
                });
                resolve(self._find({$or: [{'users': email}, {'groups': {$in: ug}}]}));
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            })
            .done();
    });
};

Permissions.isPermitted = function (user, action, object) {
    var self = this;
    return new Promise(function (resolve, reject) {
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
};

module.exports = Permissions;


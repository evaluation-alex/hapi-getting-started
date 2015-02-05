'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var CommonMixinAddRemove = require('./../common/extended-model').CommonMixinAddRemove;
var CommonMixinIsActive = require('./../common/extended-model').CommonMixinIsActive;
var CommonMixinDescription = require('./../common/extended-model').CommonMixinDescription;
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

_.extend(Permissions.prototype, CommonMixinAddRemove);
_.extend(Permissions.prototype, CommonMixinIsActive);
_.extend(Permissions.prototype, CommonMixinDescription);

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
Permissions.prototype._save = function() {
    var self = this;
    return Permissions._findByIdAndUpdate(self._id, self);
};
Permissions.prototype.addUsers = function (toAdd, role, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var modified = false;
        if (role.indexOf('user') !== -1) {
            modified = toAdd && self._add(toAdd, 'users', by);
        } else {
            modified = toAdd && (role.indexOf('group') !== -1) && self._add(toAdd, 'groups', by);
        }
        resolve(modified ? self._save() : self);
    });
};
Permissions.prototype.removeUsers = function (toRemove, role, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var modified = false;
        if (role.indexOf('user') !== -1) {
            modified = toRemove && self._remove(toRemove, 'users', by);
        } else {
            modified = toRemove && (role.indexOf('group') !== -1) && self._remove(toRemove, 'groups', by);
        }
        resolve(modified ? self._save() : self);
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


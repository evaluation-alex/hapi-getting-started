'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var AddRemove = require('./../common/extended-model').AddRemove;
var IsActive = require('./../common/extended-model').IsActive;
var Description = require('./../common/extended-model').Description;
var Save = require('./../common/extended-model').Save;
var CAudit = require('./../common/extended-model').Audit;
var Promise = require('bluebird');
var Audit = require('./../audit/model');
var UserGroups = require('./../user-groups/model');
var _ = require('lodash');

var Permissions = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    }
    /* jshint +W064 */
});

_.extend(Permissions.prototype, new AddRemove({user: 'users', group: 'groups'}));
_.extend(Permissions.prototype, IsActive);
_.extend(Permissions.prototype, Description);
_.extend(Permissions.prototype, new Save(Permissions, Audit));
_.extend(Permissions.prototype, new CAudit('Permissions', '_id'));

Permissions.prototype.isPermissionFor = function (forAction, onObject) {
    var self = this;
    var ret = (self.action === forAction || self.action === '*') &&
        (self.object === onObject || self.object === '*');
    return ret;
};
Permissions.prototype.update = function (payload, by) {
    var self = this;
    return self.setActive(payload.isActive, by)
        .add(payload.addedUsers, 'user', by)
        .remove(payload.removedUsers, 'user', by)
        .add(payload.addedGroups, 'group', by)
        .remove(payload.removedGroups, 'group', by)
        .updateDesc(payload.description, by);
};

Permissions._collection = 'permissions';

Permissions.schema = Joi.object().keys({
    _id: Joi.object(),
    description: Joi.string(),
    users: Joi.array().includes(Joi.string()).unique(),
    groups: Joi.array().includes(Joi.string()).unique(),
    action: Joi.string().required(),
    object: Joi.string().required(),
    isActive: Joi.boolean().default(true),
    createdBy: Joi.string(),
    createdOn: Joi.date(),
    updatedBy: Joi.string(),
    updatedOn: Joi.date()
});

Permissions.indexes = [
    [{'users': 1}],
    [{'groups': 1}],
    [{'action': 1, 'object': 1}, {unique: true}]
];

Permissions.newObject = function (doc, by) {
    var self = this;
    return self.create(doc.description, doc.users, doc.groups, doc.action, doc.object, by);
};

Permissions.create = function (description, users, groups, action, object, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var document = {
            description: description,
            users: users ? users: [by],
            groups: groups ? groups : [],
            action: action,
            object: object,
            isActive: true,
            createdBy: by,
            createdOn: new Date(),
            updatedBy: by,
            updatedOn: new Date()
        };
        self._insert(document, {})
            .then(function (doc) {
                if (!_.isEmpty(doc)) {
                    Audit.create('Permissions', doc._id, 'create', null, doc, by);
                }
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


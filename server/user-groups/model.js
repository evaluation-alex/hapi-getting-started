'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var CommonMixinAddRemove = require('./../common/extended-model').CommonMixinAddRemove;
var CommonMixinIsActive = require('./../common/extended-model').CommonMixinIsActive;
var CommonMixinDescription = require('./../common/extended-model').CommonMixinDescription;
var Promise = require('bluebird');
var Audit = require('./../audit/model');
var _ = require('lodash');

var UserGroups = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});
var isRoleOwner = function (role) {
    return (role.indexOf('owner') !== -1 || role.indexOf('both') !== -1);
};
var isRoleMember = function (role) {
    return (role.indexOf('member') !== -1 || role.indexOf('both') !== -1);
};

_.extend(UserGroups.prototype, CommonMixinAddRemove);
_.extend(UserGroups.prototype, CommonMixinIsActive);
_.extend(UserGroups.prototype, CommonMixinDescription);

UserGroups.prototype._audit = function (action, oldValues, newValues, by) {
    var self = this;
    return Audit.createUserGroupsAudit(self.name, action, oldValues, newValues, by);
};
UserGroups.prototype._save = function () {
    var self = this;
    return UserGroups._findByIdAndUpdate(self._id, self);
};
UserGroups.prototype.addUsers = function (toAdd, role, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var modified = toAdd && isRoleOwner(role) && self._add(toAdd, 'owners', by);
        var modified2 = toAdd && isRoleMember(role) && self._add(toAdd, 'members', by);
        resolve(modified || modified2 ? self._save() : self);
    });
};
UserGroups.prototype.removeUsers = function (toRemove, role, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var modified = toRemove && isRoleOwner(role) && self._remove(toRemove, 'owners', by);
        var modified2 = toRemove && isRoleMember(role) && self._remove(toRemove, 'members', by);
        resolve(modified || modified2 ? self._save() : self);
    });
};
UserGroups.prototype.isMember = function (email) {
    var self = this;
    return !!self._find('members', email);
};
UserGroups.prototype.isOwner = function (email) {
    var self = this;
    return !!self._find('owners', email);
};

UserGroups._collection = 'userGroups';

UserGroups.schema = Joi.object().keys({
    _id: Joi.object(),
    name: Joi.string().required(),
    description: Joi.string(),
    members: Joi.array().includes(Joi.string()).unique(),
    owners: Joi.array().includes(Joi.string()).unique(),
    isActive: Joi.boolean().default(true)
});

UserGroups.indexes = [
    [{name: 1}, {unique: true}],
    [{'members': 1}],
    [{'owners': 1}]
];

UserGroups.create = function (name, description, owner) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var document = {
            name: name,
            description: description,
            members: [owner],
            owners: [owner],
            isActive: true
        };
        self._insert(document, false)
            .then(function (userGroup) {
                Audit.createUserGroupsAudit(name, 'create', '', userGroup, owner);
                resolve(userGroup);
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            });
    });
};

UserGroups.findByName = function (name) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._findOne({name: name, isActive: true})
            .then(function(found) {
                if (!found) {
                    resolve(false);
                } else {
                    resolve(found);
                }
            })
            .catch(function(err) {
                if (err) {
                    reject(err);
                }
            });
    });
};

UserGroups.findGroupsForUser = function (email) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._find({members: email})
            .then(function(g) {
                if (!g) {
                    resolve([]);
                } else {
                    resolve(g);
                }
            })
            .catch(function(err) {
                if (err) {
                    reject(err);
                }
            });
    });
};

UserGroups.isValid = function (id, owner) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._findOne({_id: id})
            .then(function (g) {
                if (!g) {
                    resolve({message: 'not found'});
                } else {
                    if (g.isOwner(owner) || (owner === 'root')) {
                        resolve({message: 'valid'});
                    } else {
                        resolve({message: 'not an owner'});
                    }
                }
            })
            .catch(function (e) {
                reject(e);
            })
            .done();
    });
};

module.exports = UserGroups;


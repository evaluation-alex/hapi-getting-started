'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
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
UserGroups.prototype._audit = function (action, oldValues, newValues, by) {
    var self = this;
    return Audit.createUserGroupsAudit(self.name, action, oldValues, newValues, by);
};
UserGroups.prototype._find = function(role, toFind) {
    var self = this;
    return _.findWhere(self[role], toFind);
};
UserGroups.prototype._add = function (toAdd, role, by) {
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
UserGroups.prototype.addUsers = function (toAdd, role, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var modified = toAdd && isRoleOwner(role) && self._add(toAdd, 'owners', by);
        var modified2 = toAdd && isRoleMember(role) && self._add(toAdd, 'members', by);
        resolve(modified || modified2 ? UserGroups._findByIdAndUpdate(self._id, self) : self);
    });
};
UserGroups.prototype._remove = function (toRemove, role, by) {
    var self = this;
    var modified = false;
    _.forEach(toRemove, function (memberToRemove) {
        var found = _.remove(self[role], function (m) {return m === memberToRemove;});
        if (found && found.length > 0) {
            modified = true;
            self._audit('remove ' + role, memberToRemove, null, by);
        }
    });
    return modified;
};
UserGroups.prototype.removeUsers = function (toRemove, role, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var modified = toRemove && isRoleOwner(role) && self._remove(toRemove, 'owners', by);
        var modified2 = toRemove && isRoleMember(role) && self._remove(toRemove, 'members', by);
        resolve(modified || modified2 ? UserGroups._findByIdAndUpdate(self._id, self) : self);
    });
};
UserGroups.prototype.deactivate = function (by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self.isActive) {
            self._audit('isActive', true, false, by);
            self.isActive = false;
            resolve(UserGroups._findByIdAndUpdate(self._id, self));
        } else {
            resolve(self);
        }
    });
};
UserGroups.prototype.reactivate = function (by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (!self.isActive) {
            self._audit('isActive', false, true, by);
            self.isActive = true;
            resolve(UserGroups._findByIdAndUpdate(self._id, self));
        } else {
            resolve(self);
        }
    });
};
UserGroups.prototype.updateDesc = function (newDesc, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (self.description !== newDesc) {
            self._audit('change desc', self.description, newDesc, by);
            self.description = newDesc;
            resolve(UserGroups._findByIdAndUpdate(self._id, self));
        } else {
            resolve(self);
        }
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


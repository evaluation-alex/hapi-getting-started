'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./extended-model').ExtendedModel;
var Promise = require('bluebird');
var Audit = require('./audit.js');
var _ = require('lodash');

var UserGroups = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    },
    /* jshint +W064 */
    _audit: function (action, oldValues, newValues, by) {
        var self = this;
        return Audit.createUserGroupsAudit(self.name, action, oldValues, newValues, by);
    },
    addUsers: function (toAdd, role, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            var isOwner = (role.indexOf('owner') !== -1 ||  role.indexOf('both') !== -1);
            var isMember = (role.indexOf('member') !== -1 ||  role.indexOf('both') !== -1);
            var modified = false;
            if (isOwner || isMember) {
                toAdd.forEach(function (memberToAdd) {
                    var found = _.findWhere(self.members, {email: memberToAdd});
                    if (found) {
                        if (!found.isActive) {
                            modified = true;
                            found.isActive = true;
                            self._audit('add user members.' + memberToAdd + '.isActive', false, true, by);
                        }
                        if (!found.isOwner && isOwner) {
                            modified = true;
                            found.isOwner = true;
                            self._audit('add user members.' + memberToAdd + '.isOwner', false, true, by);
                        }
                        if (!found.isMember && isMember) {
                            modified = true;
                            found.isMember = true;
                            self._audit('add user members.' + memberToAdd + '.isMember', false, true, by);
                        }
                    } else {
                        modified = true;
                        self.members.push({email: memberToAdd, isOwner: isOwner, isMember: isMember, isActive: true});
                        self._audit('add user isOwner:'+isOwner+',isMember:'+isMember, '', memberToAdd, by);
                    }
                });
            }
            if (modified) {
                resolve(UserGroups._findByIdAndUpdate(self._id, self));
            } else {
                resolve(self);
            }
        });
        return promise;
    },
    removeUsers: function (toRemove, role, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            var isOwner = (role.indexOf('owner') !== -1 ||  role.indexOf('both') !== -1);
            var isMember = (role.indexOf('member') !== -1 ||  role.indexOf('both') !== -1);
            var modified = false;
            if (isOwner || isMember) {
                toRemove.forEach(function (memberToRemove) {
                    var found = _.findWhere(self.members, {email:memberToRemove});
                    if (found) {
                        if (found.isOwner && isOwner) {
                            modified = true;
                            found.isOwner = false;
                            self._audit('remove user members.' + memberToRemove + '.isOwner', true, false, by);
                        }
                        if (found.isMember && isMember) {
                            modified = true;
                            found.isMember = false;
                            self._audit('remove user members.' + memberToRemove + '.isMember', true, false, by);
                        }
                        if (!found.isMember && !found.isOwner && found.isActive) {
                            modified = true;
                            found.isActive = false;
                            self._audit('remove user members.' + memberToRemove + '.isActive', true, false, by);
                        }
                    }
                });
            }
            if (modified) {
                resolve(UserGroups._findByIdAndUpdate(self._id, self));
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
                resolve(UserGroups._findByIdAndUpdate(self._id, self));
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
                resolve(UserGroups._findByIdAndUpdate(self._id, self));
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
                resolve(UserGroups._findByIdAndUpdate(self._id, self));
            } else {
                resolve(self);
            }
        });
        return promise;
    },
    isMember: function (email) {
        var self = this;
        var ret = _.findWhere(self.members, {email: email, isMember: true, isActive: true});
        return  !!ret;
    },
    isOwner: function (email) {
        var self = this;
        var ret = _.findWhere(self.members, {email: email, isOwner: true, isActive: true});
        return !!ret;
    }
});

UserGroups._collection = 'userGroups';

UserGroups.schema = Joi.object().keys({
    _id: Joi.object(),
    name: Joi.string().required(),
    description: Joi.string(),
    members: Joi.array().includes(Joi.object().keys({
        email: Joi.string().required(),
        isMember: Joi.boolean().default(true),
        isOwner: Joi.boolean().default(false),
        isActive: Joi.boolean().default(true)
    })),
    isActive: Joi.boolean().default(true)
});

UserGroups.indexes = [
    [{name: 1}, {unique: true}],
    [{'members.email': 1, 'members.isActive': 1, 'members.isMember': 1}]
];

UserGroups.create = function (name, description, owner) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        var document = {
            name: name,
            description: description,
            members: [{email: owner, isActive: true, isMember: true, isOwner: true}],
            isActive: true
        };
        self.insert(document, function (err, results) {
            if (err) {
                reject(err);
            } else {
                if (!results) {
                    resolve(false);
                } else {
                    Audit.createUserGroupsAudit(name, 'create', '', results[0], owner);
                    resolve(results[0]);
                }
            }
        });
    });
    return promise;
};

UserGroups.findByName = function (name) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.findOne({name: name, isActive: true}, function (err, group) {
            if (err) {
                reject(err);
            } else {
                if (!group) {
                    resolve(false);
                } else {
                    resolve(group);
                }
            }
        });
    });
    return promise;
};

UserGroups.findGroupsForUser = function (email) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        var conditions = {
            members : {
                $elemMatch : {
                    email: email,
                    isActive: true,
                    isMember: true
                }
            }
        };
        self.find(conditions, function (err, groups) {
            if (err) {
                reject(err);
            } else {
                if (!groups) {
                    resolve([]);
                } else {
                    resolve(groups);
                }
            }
        });
    });
    return promise;
};

UserGroups.isValid = function (id, owner) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
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
    return promise;
};

module.exports = UserGroups;


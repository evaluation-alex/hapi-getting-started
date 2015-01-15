'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Promise = require('bluebird');
var Audit = require('./audit.js');
var _ = require('lodash');

var UserGroups = BaseModel.extend({
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    },
    _audit: function (action, oldValues, newValues, by) {
        var self = this;
        return Audit.createUserGroupsAudit(self.name, action, oldValues, newValues, by);
    },
    addUser: function (toAdd, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            var found = _.findWhere(self.members, {email: toAdd});
            var modified = false;
            if (found) {
                if (!found.isActive) {
                    modified = true;
                    found.isActive = true;
                    self._audit('reactivate members.'+toAdd+'.isActive', false, true, by);
                }
            } else {
                modified = true;
                self.members.push({email: toAdd, role: 'member', isActive: true});
                self._audit('add user', '', toAdd, by);
            }
            if (modified) {
                resolve(UserGroups._findByIdAndUpdate(self._id, self));
            } else {
                resolve(self);
            }
        });
        return promise;
    },
    removeUser: function (toRemove, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            var found = _.findWhere(self.members, {email: toRemove});
            var modified = false;
            if (found) {
                if (found.isActive) {
                    modified = true;
                    found.isActive = false;
                    self._audit('deactivate members.'+toRemove+'.isActive', true, false, by);
                }
            }
            if (modified) {
                resolve(UserGroups._findByIdAndUpdate(self._id, self));
            } else {
                resolve(self);
            }
        });
        return promise;
    },
    addOwner: function (toAdd, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            var found = _.findWhere(self.owners, {email: toAdd});
            var modified = false;
            if (found) {
                if (!found.isActive) {
                    modified = true;
                    found.isActive = true;
                    self._audit('reactivate owners.'+toAdd+'.isActive', false, true, by);
                }
            } else {
                self._audit('add owner', '', toAdd, by);
                self.owners.push({email: toAdd, isActive: true});
            }
            if (modified) {
                resolve(UserGroups._findByIdAndUpdate(self._id, self));
            } else {
                resolve(self);
            }
        });
        return promise;
    },
    removeOwner: function (toRemove, by) {
        var self = this;
        var promise = new Promise(function (resolve, reject) {
            var found = _.findWhere(self.owners, {email: toRemove});
            var modified = false;
            if (found) {
                if (found.isActive) {
                    modified = true;
                    found.isActive = false;
                    self._audit('deactivate owners.'+toRemove+'.isActive', true, false, by);
                }
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
    isMember: function(email) {
        var self = this;
        return _.findWhere(self.members, {email: email});
    },
    isOwner: function(email) {
        var self = this;
        return _.findWhere(self.owners, {email: email});
    }
});

UserGroups._collection = 'userGroups';

UserGroups.schema = Joi.object().keys({
    _id: Joi.object(),
    name: Joi.string().required(),
    description: Joi.string(),
    members: Joi.array().includes(Joi.object().keys({
        email: Joi.string().required(),
        isActive: Joi.boolean().default(true)
    })),
    owners: Joi.array().includes(Joi.object().keys({
        email: Joi.string().required(),
        isActive: Joi.boolean().default(true)
    })),
    isActive: Joi.boolean().default(true)
});

UserGroups.indexes = [
    [{name: 1}, {unique: true}],
    [{'members.email': 1, 'members.isActive': 1}]
];

UserGroups.create = function (name, domain, description, owner) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        var document = {
            name: name + '@' + domain,
            description: description,
            members: [{email: owner, isActive: true}],
            owners: [{email: owner, isActive: true}],
            isActive: true
        };
        self.insert(document, function (err, results) {
            if (err) {
                reject(err);
            } else {
                if (!results) {
                    resolve({});
                } else {
                    resolve(results[0]);
                }
            }
        });
    });
    return promise;
};

UserGroups.findByNameDomain = function (name, domain) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.findOne({name: name + '@' + domain, isActive: true}, function (err, group) {
            if (err) {
                reject(err);
            } else {
                if (!group) {
                    resolve({});
                } else {
                    resolve(group);
                }
            }
        });
    });
    return promise;
};

UserGroups.findGroupsForMember = function (email) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.find({'members.email': email, 'members.isActive': true}, function (err, groups) {
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

UserGroups._findByIdAndUpdate = function (id, obj) {
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

UserGroups._findOne = function (conditions) {
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

module.exports = UserGroups;


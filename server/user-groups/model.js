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
var _ = require('lodash');

var UserGroups = ExtendedModel.extend({
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

_.extend(UserGroups.prototype, new AddRemove({owner: 'owners', member: 'members'}));
_.extend(UserGroups.prototype, IsActive);
_.extend(UserGroups.prototype, Description);
_.extend(UserGroups.prototype, new Save(UserGroups, Audit));
_.extend(UserGroups.prototype, new CAudit('UserGroups', 'name'));

UserGroups.prototype.isMember = function (email) {
    var self = this;
    return !!self._find('members', email);
};
UserGroups.prototype.isOwner = function (email) {
    var self = this;
    return !!self._find('owners', email);
};

UserGroups.prototype.update = function (payload, by) {
    var self = this;
    return self.setActive(payload.isActive, by)
        .add(payload.addedMembers, 'member', by)
        .remove(payload.removedMembers, 'member', by)
        .add(payload.addedOwners, 'owner', by)
        .remove(payload.removedOwners, 'owner', by)
        .updateDesc(payload.description, by);
};

UserGroups._collection = 'userGroups';

UserGroups.schema = Joi.object().keys({
    _id: Joi.object(),
    name: Joi.string().required(),
    description: Joi.string(),
    members: Joi.array().includes(Joi.string()).unique(),
    owners: Joi.array().includes(Joi.string()).unique(),
    isActive: Joi.boolean().default(true),
    createdBy: Joi.string(),
    createdOn: Joi.date(),
    updatedBy: Joi.string(),
    updatedOn: Joi.date()
});

UserGroups.indexes = [
    [{name: 1}, {unique: true}],
    [{'members': 1}],
    [{'owners': 1}]
];

UserGroups.newObject = function (doc, by) {
    var self = this;
    return new Promise(function (resolve/*, reject*/) {
        self.create(doc.name, doc.description, by)
            .then(function (userGroup) {
                if (userGroup) {
                    resolve(userGroup.add(doc.members, 'member', by)
                        .add(doc.owners, 'owner', by)
                        ._save());
                } else {
                    resolve(userGroup);
                }
            });
    });
};

UserGroups.create = function (name, description, owner) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var document = {
            name: name,
            description: description,
            members: [owner],
            owners: [owner],
            isActive: true,
            createdBy: owner,
            createdOn: new Date(),
            updatedBy: owner,
            updatedOn: new Date()
        };
        self._insert(document, false)
            .then(function (userGroup) {
                if (userGroup) {
                    Audit.create('UserGroups', name, 'create', null, userGroup, owner);
                }
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
            .then(function (found) {
                if (!found) {
                    resolve(false);
                } else {
                    resolve(found);
                }
            })
            .catch(function (err) {
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
            .then(function (g) {
                if (!g) {
                    resolve([]);
                } else {
                    resolve(g);
                }
            })
            .catch(function (err) {
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


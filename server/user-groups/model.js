'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var AddRemove = require('./../common/extended-model').AddRemove;
var IsActive = require('./../common/extended-model').IsActive;
var Properties = require('./../common/extended-model').Properties;
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

_.extend(UserGroups.prototype, new AddRemove({owner: 'owners', member: 'members', needsApproval: 'needsApproval'}));
_.extend(UserGroups.prototype, IsActive);
_.extend(UserGroups.prototype, new Properties(['description', 'access', 'isActive']));
_.extend(UserGroups.prototype, new Save(UserGroups, Audit));
_.extend(UserGroups.prototype, new CAudit('UserGroups', 'name'));

UserGroups.prototype.update = function (payload, by) {
    var self = this;
    return self.setIsActive(payload.isActive, by)
        .add(payload.addedMembers, 'member', by)
        .remove(payload.removedMembers, 'member', by)
        .add(payload.addedOwners, 'owner', by)
        .remove(payload.removedOwners, 'owner', by)
        .setDescription(payload.description, by)
        .setAccess(payload.access, by);
};

UserGroups._collection = 'userGroups';

UserGroups.schema = Joi.object().keys({
    _id: Joi.object(),
    name: Joi.string().required(),
    organisation: Joi.string().required(),
    description: Joi.string(),
    members: Joi.array().includes(Joi.string()).unique(),
    owners: Joi.array().includes(Joi.string()).unique(),
    needsApproval: Joi.array().includes(Joi.string()).unique(),
    access: Joi.string().valid(['restricted', 'public']).default('restricted'),
    isActive: Joi.boolean().default(true),
    createdBy: Joi.string(),
    createdOn: Joi.date(),
    updatedBy: Joi.string(),
    updatedOn: Joi.date()
});

UserGroups.indexes = [
    [{name: 1, organisation: 1}, {unique: true}],
    [{'members': 1}],
    [{'owners': 1}]
];

UserGroups.newObject = function (doc, by) {
    var self = this;
    return new Promise(function (resolve/*, reject*/) {
        self.create(doc.payload.name, doc.auth.credentials.user.organisation, doc.payload.description, by)
            .then(function (userGroup) {
                if (userGroup) {
                    resolve(userGroup.add(doc.payload.members, 'member', by)
                        .add(doc.payload.owners, 'owner', by)
                        .setAccess(doc.payload.access, by)
                        .save());
                } else {
                    resolve(userGroup);
                }
            });
    });
};

UserGroups.create = function (name, organisation, description, owner) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var document = {
            name: name,
            organisation: organisation,
            description: description,
            members: [owner],
            owners: [owner],
            needsApproval: [],
            access: 'restricted',
            isActive: true,
            createdBy: owner,
            createdOn: new Date(),
            updatedBy: owner,
            updatedOn: new Date()
        };
        self._insert(document, false)
            .then(function (userGroup) {
                if (userGroup) {
                    Audit.create('UserGroups', name, 'create', null, userGroup, owner, organisation);
                }
                resolve(userGroup);
            })
            .catch(function (err) {
                reject(err);
            });
    });
};

UserGroups.findGroupsForUser = function (email, organisation) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._find({members: email, organisation: organisation})
            .then(function (g) {
                if (!g) {
                    resolve([]);
                } else {
                    resolve(g);
                }
            })
            .catch(function (err) {
                reject(err);
            });
    });
};

module.exports = UserGroups;


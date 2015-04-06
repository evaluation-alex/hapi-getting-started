'use strict';
let ModelBuilder = require('./../common/model-builder');
let Joi = require('joi');
let _ = require('lodash');
var UserGroups = (new ModelBuilder())
    .onModel(function UserGroups (attrs) {
        _.assign(this, attrs);
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    })
    .inMongoCollection('user-groups')
    .usingSchema(Joi.object().keys({
        _id: Joi.object(),
        name: Joi.string().required(),
        organisation: Joi.string().required(),
        description: Joi.string(),
        members: Joi.array().items(Joi.string()).unique(),
        owners: Joi.array().items(Joi.string()).unique(),
        needsApproval: Joi.array().items(Joi.string()).unique(),
        access: Joi.string().only(['restricted', 'public']).default('restricted'),
        isActive: Joi.boolean().default(true),
        createdBy: Joi.string(),
        createdOn: Joi.date(),
        updatedBy: Joi.string(),
        updatedOn: Joi.date()
    }))
    .addIndex([{name: 1, organisation: 1}, {unique: true}])
    .supportInsertAndAudit('name', 'create')
    .supportSoftDeletes()
    .supportJoinApproveRejectLeave('addedMembers', 'members', 'needsApproval')
    .supportUpdates([
        'isActive',
        'description',
        'access'
    ], ['owners',
        'members',
        'needsApproval'
    ])
    .supportSave()
    .supportTrackChanges('name')
    .supportAreValidQuery('name')
    .doneConfiguring();
UserGroups.newObject = (doc, by) => {
    let self = this;
    return self.create(doc.payload.name,
        doc.auth.credentials.user.organisation,
        doc.payload.description,
        by)
        .then((userGroup) => {
            return userGroup
                .addMembers(doc.payload.members, by)
                .addOwners(doc.payload.owners, by)
                .setAccess(doc.payload.access, by)
                .save();
        });
};
UserGroups.create = (name, organisation, description, owner) => {
    let self = this;
    let document = {
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
    return self.insertAndAudit(document);
};
module.exports = UserGroups;

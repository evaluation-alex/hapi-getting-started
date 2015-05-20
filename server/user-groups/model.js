'use strict';
let ModelBuilder = require('./../common/model-builder');
let schemas = require('./schemas');
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
    .usingConnection('app')
    .usingSchema(schemas.model)
    .addIndex([{name: 1, organisation: 1}, {unique: true}])
    .decorateWithInsertAndAudit('_id', 'create')
    .decorateWithSoftDeletes()
    .decorateWithUpdates([
        'isActive',
        'description',
        'access'
    ], ['owners',
        'members',
        'needsApproval'
    ], 'update',
    'members', 'needsApproval')
    .decorateWithSave()
    .decorateWithTrackChanges('_id')
    .decorateWithAreValidQuery('name')
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

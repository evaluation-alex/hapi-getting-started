'use strict';
const {org} = require('./../common/utils');
const {build} = require('./../common/dao');
const schemas = require('./schemas');
const UserGroups = function UserGroups(attrs) {
    this.init(attrs);
    return this;
};
UserGroups.newObject = function newObject(doc, by) {
    return UserGroups.create(doc.payload.name,
        org(doc),
        doc.payload.description,
        by)
        .then(userGroup => {
            return userGroup
                .addMembers(doc.payload.members, by)
                .addOwners(doc.payload.owners, by)
                .setAccess(doc.payload.access, by)
                .save();
        });
};
UserGroups.create = function create(name, organisation, description, owner) {
    return UserGroups.insertAndAudit({
        name,
        organisation,
        description,
        members: [owner],
        owners: [owner],
        needsApproval: [],
        access: 'restricted'
    }, owner);
};
module.exports = build(UserGroups, schemas.dao, schemas.model, [], 'name');


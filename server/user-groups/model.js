'use strict';
const build = require('./../common/dao').build;
const schemas = require('./schemas');
const UserGroups = function UserGroups(attrs) {
    this.init(attrs);
    return this;
};
UserGroups.newObject = function newObject(doc, by, org) {
    return UserGroups.create(doc.payload.name,
        doc.payload.description,
        by,
        org)
        .then(userGroup => {
            return userGroup
                .addMembers(doc.payload.members, by)
                .addOwners(doc.payload.owners, by)
                .setAccess(doc.payload.access, by)
                .save();
        });
};
UserGroups.create = function create(name, description, owner, organisation) {
    return UserGroups.insertAndAudit({
        name,
        description,
        members: [owner],
        owners: [owner],
        needsApproval: [],
        access: 'restricted'
    }, owner, organisation);
};
module.exports = build(UserGroups, schemas.dao, schemas.model, [], 'name');


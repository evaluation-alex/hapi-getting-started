'use strict';
const build = require('./../common/dao').build;
const modelSchema = require('./../../shared/model')(require('joi'), require('./../lodash'))['user-groups'];
const daoOptions = {
    connection: 'app',
    collection: 'user-groups',
    indexes: [
        {fields: {name: 1, organisation: 1}, options: {unique: true}}
    ],
    updateMethod: {
        method: 'update',
        props: [
            'isActive',
            'description',
            'access'
        ],
        arrProps: [
            'owners',
            'members',
            'needsApproval'
        ]
    },
    saveAudit: true,
    joinApproveRejectLeave: {
        affectedRole: 'members',
        needsApproval: 'needsApproval'
    },
    nonEnumerables: ['audit'],
    schemaVersion: 1
};
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
module.exports = build(UserGroups, daoOptions, modelSchema, [], 'name');


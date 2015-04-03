'use strict';
let Model = require('./../common/model');
let Joi = require('joi');
let Insert = require('./../common/mixins/insert');
let AreValid = require('./../common/mixins/exist');
let AddRemove = require('./../common/mixins/add-remove');
let JoinApproveRejectLeave = require('./../common/mixins/join-approve-reject-leave');
let Update = require('./../common/mixins/update');
let Properties = require('./../common/mixins/properties');
let IsActive = require('./../common/mixins/is-active');
let Save = require('./../common/mixins/save');
let CAudit = require('./../common/mixins/audit');
let _ = require('lodash');
var UserGroups = function UserGroups (attrs) {
    _.assign(this, attrs);
    Object.defineProperty(this, 'audit', {
        writable: true,
        enumerable: false
    });
};
UserGroups.collection = 'user-groups';
UserGroups.schema = Joi.object().keys({
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
});
UserGroups.indexes = [
    [{name: 1, organisation: 1}, {unique: true}]
];
_.extend(UserGroups, Model);
_.extend(UserGroups, new Insert('name', 'create'));
_.extend(UserGroups, new AreValid('name'));
_.extend(UserGroups.prototype, new IsActive());
_.extend(UserGroups.prototype, new AddRemove(['owners', 'members', 'needsApproval']));
_.extend(UserGroups.prototype, new Properties(['description', 'access', 'isActive']));
_.extend(UserGroups.prototype, new JoinApproveRejectLeave('addedMembers', 'members', 'needsApproval'));
_.extend(UserGroups.prototype, new Update(['isActive', 'description', 'access'], ['owners', 'members', 'needsApproval']));
_.extend(UserGroups.prototype, new Save(UserGroups));
_.extend(UserGroups.prototype, new CAudit(UserGroups.collection, 'name'));
UserGroups.newObject = (doc, by) => {
    let self = this;
    return self.create(doc.payload.name,
        doc.auth.credentials.user.organisation,
        doc.payload.description,
        by)
        .then((userGroup) => {
            return userGroup
                .add(doc.payload.members, 'members', by)
                .add(doc.payload.owners, 'owners', by)
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

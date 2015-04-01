'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Joi = require('joi');
var promisify = require('./../common/mixins/promisify');
var Insert = require('./../common/mixins/insert');
var AreValid = require('./../common/mixins/exist');
var AddRemove = require('./../common/mixins/add-remove');
var JoinApproveRejectLeave = require('./../common/mixins/join-approve-reject-leave');
var Update = require('./../common/mixins/update');
var Properties = require('./../common/mixins/properties');
var IsActive = require('./../common/mixins/is-active');
var Save = require('./../common/mixins/save');
var CAudit = require('./../common/mixins/audit');
var _ = require('lodash');

var UserGroups = function UserGroups (attrs) {
    _.assign(this, attrs);
    Object.defineProperty(this, 'audit', {
        writable: true,
        enumerable: false
    });
};

UserGroups._collection = 'user-groups';

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

_.extend(UserGroups, BaseModel);
promisify(UserGroups, ['find', 'findOne', 'pagedFind', 'findOneAndReplace', 'insertOne']);
_.extend(UserGroups, new Insert('name', 'create'));
_.extend(UserGroups, new AreValid('name'));
_.extend(UserGroups.prototype, new IsActive());
_.extend(UserGroups.prototype, new AddRemove(['owners', 'members', 'needsApproval']));
_.extend(UserGroups.prototype, new Properties(['description', 'access', 'isActive']));
_.extend(UserGroups.prototype, new JoinApproveRejectLeave('addedMembers', 'members', 'needsApproval'));
_.extend(UserGroups.prototype, new Update(['isActive', 'description', 'access'], ['owners', 'members', 'needsApproval']));
_.extend(UserGroups.prototype, new Save(UserGroups));
_.extend(UserGroups.prototype, new CAudit(UserGroups._collection, 'name'));

UserGroups.newObject = function newObject (doc, by) {
    var self = this;
    return self.create(doc.payload.name,
        doc.auth.credentials.user.organisation,
        doc.payload.description,
        by)
        .then(function (userGroup) {
            return userGroup
                .add(doc.payload.members, 'members', by)
                .add(doc.payload.owners, 'owners', by)
                .setAccess(doc.payload.access, by)
                .save();
        });
};

UserGroups.create = function create (name, organisation, description, owner) {
    var self = this;
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
    return self._insertAndAudit(document);
};

module.exports = UserGroups;

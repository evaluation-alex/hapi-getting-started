'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model');
var AddRemove = require('./../common/model-mixins').AddRemove;
var IsActive = require('./../common/model-mixins').IsActive;
var JoinApproveReject = require('./../common/model-mixins').JoinApproveReject;
var Update = require('./../common/model-mixins').Update;
var Properties = require('./../common/model-mixins').Properties;
var Save = require('./../common/model-mixins').Save;
var CAudit = require('./../common/model-mixins').Audit;
var Promise = require('bluebird');
var Audit = require('./../audit/model');
var _ = require('lodash');
var utils = require('./../common/utils');

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

_.extend(UserGroups.prototype, new AddRemove({owner: 'owners',
    member: 'members',
    needsApproval: 'needsApproval'
}));
_.extend(UserGroups.prototype, IsActive);
_.extend(UserGroups.prototype, new Properties(['description', 'access', 'isActive']));
_.extend(UserGroups.prototype, new JoinApproveReject('addedMembers', 'member', 'needsApproval'));
_.extend(UserGroups.prototype, new Update({
    isActive: 'isActive',
    description: 'description',
    access: 'access'
}, {owner: 'owners',
    member: 'members',
    needsApproval: 'needsApproval'
}));
_.extend(UserGroups.prototype, new Save(UserGroups, Audit));
_.extend(UserGroups.prototype, new CAudit('UserGroups', 'name'));

UserGroups._collection = 'userGroups';

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
    [{name: 1, organisation: 1}, {unique: true}],
    [{'members': 1}],
    [{'owners': 1}]
];

/*jshint unused:false*/
UserGroups.newObject = function (doc, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.create(doc.payload.name,
            doc.auth.credentials.user.organisation,
            doc.payload.description,
            by)
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
/*jshint unused:true*/

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
                utils.logAndReject(err, reject);
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
                utils.logAndReject(err, reject);
            });
    });
};

module.exports = UserGroups;


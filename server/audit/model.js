'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var Promise = require('bluebird');
var _ = require('lodash');

var Audit = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});

Audit._collection = 'audit';

Audit.schema = Joi.object().keys({
    objectChangedType: Joi.string().required(),
    objectChangedId: Joi.string(),
    action: Joi.string(),
    origValues: Joi.object(),
    newValues: Joi.object(),
    timestamp: Joi.date(),
    by: Joi.string()
});

Audit.indexes = [
    [{objectChangedType: 1, objectChangedId: 1, action: 1}]
];

Audit.createUsersAudit = function (email, action, origValues, newValues, by) {
    var self = this;
    return self.create('Users', email, action, origValues, newValues, by);
};

Audit.createUserGroupsAudit = function (name, action, origValues, newValues, by) {
    var self = this;
    return self.create('UserGroups', name, action, origValues, newValues, by);
};

Audit.createPermissionsAudit = function (name, action, origValues, newValues, by) {
    var self = this;
    return self.create('Permissions', name, action, origValues, newValues, by);
};

Audit.create = function (type, id, action, origValues, newValues, by) {
    var self = this;
    var doc = {
        objectChangedType: type,
        objectChangedId: id,
        action: action,
        origValues: origValues,
        newValues: newValues,
        timestamp: new Date(),
        by: by
    };
    return self._insert(doc, undefined);
};

Audit.findUsersAudit = function (conditions) {
    var self = this;
    return self._find(_.merge(_.omit(conditions, ['userId']), {
        objectChangedType: 'Users',
        objectChangedId: conditions.userId
    }));
};

Audit.findUserGroupsAudit = function (conditions) {
    var self = this;
    return self._find(_.merge(_.omit(conditions, ['name']), {
        objectChangedType: 'UserGroups',
        objectChangedId: conditions.name
    }));
};

Audit.findPermissionsAudit = function (conditions) {
    var self = this;
    return self._find(_.merge(_.omit(conditions, ['_id']), {
        objectChangedType: 'Permissions',
        objectChangedId: conditions._id
    }));
};

Audit.findChangesByUser = function (by) {
    var self = this;
    return self._find({by: by});
};

module.exports = Audit;

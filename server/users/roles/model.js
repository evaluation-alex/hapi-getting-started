'use strict';
var BaseModel = require('./../../common/model');
var Joi = require('joi');
var _ = require('lodash');
var Roles = function Roles (attrs) {
    _.assign(this, attrs);
};
Roles.collection = 'roles';
Roles.schema = Joi.object().keys({
    _id: Joi.object(),
    name: Joi.string().required(),
    organisation: Joi.string().required(),
    permissions: Joi.array().items(Joi.object().keys({
        action: Joi.string().only('view', 'update').required(),
        object: Joi.string().required()
    })).unique()
});
Roles.indexes = [
    [{name: 1, organisation: 1}, {unique: true}],
];
_.extend(Roles, BaseModel);
Roles.prototype.hasPermissionsTo = function hasPermissionsTo (performAction, onObject) {
    var self = this;
    var ret = !!_.find(self.permissions, function (p) {
        return ((p.object === onObject || p.object === '*') && (p.action === performAction || p.action === 'update'));
    });
    return ret;
};
Roles.create = function create (name, organisation, permissions) {
    var self = this;
    var document = {
        name: name,
        organisation: organisation,
        permissions: permissions
    };
    return self.insert(document);
};
module.exports = Roles;

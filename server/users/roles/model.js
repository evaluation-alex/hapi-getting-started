'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Joi = require('joi');
var promisify = require('./../../common/mixins/promisify');
var _ = require('lodash');

var Roles = function Roles (attrs) {
    _.assign(this, attrs);
};

Roles._collection = 'roles';

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
promisify(Roles, ['insertOne', 'find', 'findOne']);

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
    return self._insertOne(document)
        .then(function (role) {
            return role[0];
        });
};

module.exports = Roles;

'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var ObjectAssign = require('object-assign');
var Joi = require('joi');
var Promisify = require('./../common/mixins/promisify');
var _ = require('lodash');

var Roles = BaseModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});

Promisify(Roles, ['insert', 'find', 'findOne']);

Roles.prototype.hasPermissionsTo = function (performAction, onObject) {
    var self = this;
    var ret = !!_.find(self.permissions, function (p) {
        return ((p.object === onObject || p.object === '*') && (p.action === performAction || p.action === 'update'));
    });
    return ret;
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

Roles.create = function (name, organisation, permissions) {
    var self = this;
    var document = {
        name: name,
        organisation: organisation,
        permissions: permissions
    };
    return self._insert(document)
        .then(function (role) {
            return role[0];
        });
};

module.exports = Roles;

'use strict';
let ModelBuilder = require('./../../common/model-builder');
let Joi = require('joi');
let _ = require('lodash');
var Roles = (new ModelBuilder())
    .onModel(function Roles (attrs) {
        _.assign(this, attrs);
    })
    .inMongoCollection('roles')
    .usingConnection('app')
    .usingSchema(Joi.object().keys({
        _id: Joi.object(),
        name: Joi.string().required(),
        organisation: Joi.string().required(),
        permissions: Joi.array().items(Joi.object().keys({
            action: Joi.string().only('view', 'update').required(),
            object: Joi.string().required()
        })).unique()
    }))
    .addIndex([{name: 1, organisation: 1}, {unique: true}])
    .doneConfiguring();
Roles.prototype.hasPermissionsTo = (performAction, onObject) => {
    let self = this;
    return !!_.find(self.permissions,
        (p) => ((p.object === onObject || p.object === '*') && (p.action === performAction || p.action === 'update'))
    );
};
Roles.create = (name, organisation, permissions) => {
    let self = this;
    let document = {
        name: name,
        organisation: organisation,
        permissions: permissions
    };
    return self.insert(document);
};
module.exports = Roles;

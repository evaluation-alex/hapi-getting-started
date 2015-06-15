'use strict';
let ModelBuilder = require('./../../common/model-builder');
let schemas = require('./schemas');
let _ = require('lodash');
var Roles = (new ModelBuilder())
    .onModel(function Roles (attrs) {
        _.assign(this, attrs);
    })
    .inMongoCollection('roles')
    .usingConnection('app')
    .usingSchema(schemas.model)
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

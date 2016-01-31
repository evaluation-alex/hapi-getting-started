'use strict';
const find = require('./../lodash').find;
const build = require('./../common/dao').build;
const schemas = require('./schemas');
const Roles = function Roles(attrs) {
    this.init(attrs);
    return this;
};
Roles.create = function create(name, organisation, permissions) {
    return Roles.upsert({
        name,
        organisation,
        permissions
    });
};
Roles.prototype = {
    hasPermissionsTo(performAction, onObject) {
        return !!find(this.permissions,
            p => ((p.object === onObject || p.object === '*') && (p.action === performAction || p.action === 'update'))
        );
    }
};
module.exports = build(Roles, schemas.dao, schemas.model);

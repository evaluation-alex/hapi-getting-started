'use strict';
const build = require('./../common/dao').build;
const modelSchema = require('./../../shared/model')(require('joi'), require('./../lodash')).roles;
const daoOptions = {
    connection: 'app',
    collection: 'roles',
    indexes: [
        {fields: {name: 1, organisation: 1}, options: {unique: true}}
    ],
    saveAudit: false,
    isReadonly: false,
    schemaVersion: 1
};
const Roles = function Roles(attrs) {
    this.init(attrs);
    return this;
};
Roles.create = function create(name, permissions, organisation) {
    return Roles.insertAndAudit({
        name,
        permissions
    }, 'root', organisation);
};
Roles.prototype = {
    hasPermissionsTo(performAction, onObject) {
        return !!this.permissions.find(p =>
            ((p.object === onObject || p.object === '*') &&
            (p.action === performAction || p.action === 'update'))
        );
    }
};
module.exports = build(Roles, daoOptions, modelSchema);

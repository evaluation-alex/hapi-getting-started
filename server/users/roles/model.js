'use strict';
const {find} = require('lodash');
const {build} = require('./../../common/dao');
const schemas = require('./schemas');
class Roles {
    constructor(attrs) {
        this.init(attrs);
    }
    hasPermissionsTo(performAction, onObject) {
        return !!find(this.permissions,
            p => ((p.object === onObject || p.object === '*') && (p.action === performAction || p.action === 'update'))
        );
    }
    static create(name, organisation, permissions) {
        return Roles.upsert({
            name,
            organisation,
            permissions
        });
    }
}
build(Roles, schemas.dao, schemas.model);
module.exports = Roles;

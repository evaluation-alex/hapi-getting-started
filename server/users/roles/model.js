'use strict';
import {find} from 'lodash';
import {build} from './../../common/dao';
import schemas from './schemas';
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
        let document = {
            name,
            organisation,
            permissions
        };
        return Roles.upsert(document);
    }
}
build(Roles, schemas.dao, schemas.model);
export default Roles;

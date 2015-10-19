'use strict';
import {assign} from 'lodash';
import {build} from './../common/dao';
import schemas from './schemas';
class Audit {
    constructor(attrs) {
        assign(this, attrs);
    }
    static findAudit(type, id, conditions) {
        conditions.objectChangedType = type;
        conditions.objectChangedId = id;
        return Audit.find(conditions);
    }
}
build(Audit, schemas.dao, schemas.model);
export default Audit;

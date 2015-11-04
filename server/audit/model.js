'use strict';
import {merge} from 'lodash';
import {build} from './../common/dao';
import schemas from './schemas';
class Audit {
    constructor(attrs) {
        this.init(attrs);
    }
    static findAudit(objectChangedType, objectChangedId, conditions) {
        return Audit.find(merge({objectChangedType, objectChangedId}, conditions));
    }
}
build(Audit, schemas.dao, schemas.model);
export default Audit;

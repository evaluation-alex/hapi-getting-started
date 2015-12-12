'use strict';
const {merge} = require('lodash');
const {build} = require('./../common/dao');
const schemas = require('./schemas');
class Audit {
    constructor(attrs) {
        this.init(attrs);
    }
    static findAudit(objectChangedType, objectChangedId, conditions) {
        return Audit.find(merge({objectChangedType, objectChangedId}, conditions));
    }
}
build(Audit, schemas.dao, schemas.model);
module.exports = Audit;

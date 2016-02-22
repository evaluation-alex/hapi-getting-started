'use strict';
const merge = require('./../lodash').merge;
const build = require('./../common/dao').build;
const schemas = require('./schemas');
const Audit = function Audit(attrs) {
    this.init(attrs);
    return this;
};
Audit.findAudit = function findAudit(objectChangedType, objectChangedId, conditions) {
    return Audit.find(merge({}, {objectChangedType, objectChangedId}, conditions));
};
module.exports = build(Audit, schemas.dao, schemas.model);

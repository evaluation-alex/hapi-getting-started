'use strict';
const _ = require('./../lodash');
const {merge} = _;
const build = require('./../common/dao').build;
const modelSchema = require('./../../shared/model')(require('joi'), _).audit;
const daoOptions = {
    connection: 'app',
    collection: 'audit',
    indexes: [
        {fields: {organisation: 1, objectChangedType: 1}},
        {fields: {by: 1, on: 1}},
        {fields: {on: 1}}
    ],
    saveAudit: false,
    isReadonly: true,
    schemaVersion: 1
};
const Audit = function Audit(attrs) {
    this.init(attrs);
    return this;
};
Audit.findAudit = function findAudit(objectChangedType, objectChangedId, conditions) {
    return Audit.find(merge({objectChangedType, objectChangedId}, conditions));
};
module.exports = build(Audit, daoOptions, modelSchema);

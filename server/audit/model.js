'use strict';
let _ = require('lodash');
let schemas = require('./schemas');
let ModelBuilder = require('./../common/model-builder');
var Audit = (new ModelBuilder())
    .onModel(function Audit (attrs) {
        _.assign(this, attrs);
    })
    .inMongoCollection('audit')
    .usingConnection('app')
    .usingSchema(schemas.model)
    .addIndex([{organisation: 1, objectChangedType: 1}])
    .addIndex([{by: 1, on: 1}])
    .addIndex([{on: 1}])
    .doneConfiguring();
Audit.findAudit = (type, id, conditions) => {
    let self = this;
    conditions.objectChangedType = type;
    conditions.objectChangedId = id;
    return self.find(conditions);
};
module.exports = Audit;

'use strict';
let _ = require('lodash');
var Joi = require('joi');
var ModelBuilder = require('./../common/model-builder');
var Audit = (new ModelBuilder())
    .onModel(function Audit (attrs) {
        _.assign(this, attrs);
    })
    .inMongoCollection('audit')
    .usingSchema(Joi.object().keys({
        _id: Joi.object(),
        objectChangedType: Joi.string().required(),
        objectChangedId: Joi.string().required(),
        organisation: Joi.string().required(),
        by: Joi.string().required(),
        on: Joi.date(),
        change: Joi.array().items(Joi.object().keys({
            action: Joi.string(),
            origValues: Joi.object(),
            newValues: Joi.object()
        }))
    }))
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

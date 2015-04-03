'use strict';
let Model = require('./../common/model');
let _ = require('lodash');
var Joi = require('joi');
var Audit = function Audit (attrs) {
    _.assign(this, attrs);
};
Audit.collection = 'audit';
Audit.schema = Joi.object().keys({
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
});
Audit.indexes = [
    [{organisation: 1, objectChangedType: 1}],
    [{by: 1, on: 1}],
    [{on: 1}]
];
_.extend(Audit, Model);
Audit.findAudit = (type, id, conditions) => {
    let self = this;
    conditions.objectChangedType = type;
    conditions.objectChangedId = id;
    return self.find(conditions);
};
module.exports = Audit;

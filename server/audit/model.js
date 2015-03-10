'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var Promisify = require('./../common/mixins/promisify');

var Audit = BaseModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});

Promisify(Audit, ['pagedFind', 'find']);

Audit._collection = 'audit';

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


Audit.findAudit = function findAudit (type, id, conditions) {
    var self = this;
    conditions.objectChangedType = type;
    conditions.objectChangedId = id;
    return self._find(conditions);
};

module.exports = Audit;

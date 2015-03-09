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
    action: Joi.string(),
    origValues: Joi.object(),
    newValues: Joi.object(),
    organisation: Joi.string().required(),
    by: Joi.string().required(),
    timestamp: Joi.date()
});

Audit.indexes = [
    [{organisation: 1, objectChangedType: 1, objectChangedId: 1, action: 1}],
    [{by: 1, timestamp: 1}],
    [{timestamp: 1}]
];


Audit.findAudit = function findAudit (type, id, conditions) {
    var self = this;
    conditions.objectChangedType = type;
    conditions.objectChangedId = id;
    return self._find(conditions);
};

module.exports = Audit;

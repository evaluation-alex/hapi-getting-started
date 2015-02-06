'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var Promise = require('bluebird');
var _ = require('lodash');

var Audit = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});

Audit._collection = 'audit';

Audit.schema = Joi.object().keys({
    objectChangedType: Joi.string().required(),
    objectChangedId: Joi.string(),
    action: Joi.string(),
    origValues: Joi.object(),
    newValues: Joi.object(),
    timestamp: Joi.date(),
    by: Joi.string()
});

Audit.indexes = [
    [{objectChangedType: 1, objectChangedId: 1, action: 1}]
];

Audit.create = function (type, id, action, origValues, newValues, by) {
    var self = this;
    var doc = {
        objectChangedType: type,
        objectChangedId: id,
        action: action,
        origValues: origValues,
        newValues: newValues,
        timestamp: new Date(),
        by: by
    };
    return self._insert(doc, undefined);
};

Audit.findAudit = function(type, id, conditions) {
    var self = this;
    conditions.objectChangedType = type;
    conditions.objectChangedId = id;
    return self._find(conditions);
};

module.exports = Audit;

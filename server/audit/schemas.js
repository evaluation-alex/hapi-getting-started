'use strict';
const Joi = require('joi');
const shared = require('./../../shared/audit/validation');
module.exports = {
    dao: {
        connection: 'app',
        collection: 'audit',
        indexes: [
            {fields: {organisation: 1, objectChangedType: 1}},
            {fields: {by: 1, on: 1}},
            {fields: {on: 1}}
        ],
        saveAudit: false,
        isReadonly: true
    },
    model: {
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
    },
    controller: {
        find: shared.controller.find,
        findDefaults: {sort: '-on', limit: 5, page: 1},
        findOptions: {
            forPartial: [['by', 'by']],
            forDateBefore: [['onBefore', 'on']],
            forDateAfter: [['onAfter', 'on']],
            forExact: [['objectType', 'objectChangedType'], ['objectChangedId', 'objectChangedId']]
        }
    }
};

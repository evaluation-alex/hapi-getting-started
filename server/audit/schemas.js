'use strict';
const Joi = require('joi');
const shared = require('./../../shared/audit/validation');
const common = require('./../common/schemas');
const _ = require('./../lodash');
const {merge, pick} = _;
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
        isReadonly: true,
        schemaVersion: 1
    },
    model: merge({}, {
        objectChangedType: Joi.string(),
        objectChangedId: [Joi.object(), Joi.string().regex(/^[0-9a-fA-F]{24}$/), Joi.string()],
        by: Joi.string(),
        on: Joi.date(),
        change: Joi.array().items({
            action: Joi.string(),
            origValues: Joi.any(),
            newValues: Joi.any()
        })
    }, pick(common.model, ['_id', 'organisation', 'objectVersion', 'schemaVersion'])),
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

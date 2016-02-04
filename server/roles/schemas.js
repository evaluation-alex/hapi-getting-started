'use strict';
const Joi = require('joi');
const common = require('./../common/schemas');
const _ = require('./../lodash');
const {merge, pick} = _;
module.exports = {
    dao: {
        connection: 'app',
        collection: 'roles',
        indexes: [
            {fields: {name: 1, organisation: 1}, options: {unique: true}}
        ],
        saveAudit: false,
        isReadonly: true,
        schemaVersion: 1
    },
    model: merge({}, {
        name: Joi.string(),
        permissions: Joi.array().items({
            action: Joi.string().only('view', 'update'),
            object: Joi.string()
        }).unique()
    }, pick(common.model, ['_id', 'organisation', 'schemaVersion', 'objectVersion']))
};

'use strict';
const Joi = require('joi');
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
    model: {
        _id: Joi.object(),
        name: Joi.string().required(),
        organisation: Joi.string().required(),
        permissions: Joi.array().items({
            action: Joi.string().only('view', 'update').required(),
            object: Joi.string().required()
        }).unique()
    }
};

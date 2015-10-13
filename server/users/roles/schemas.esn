'use strict';
import Joi from 'joi';
export default {
    dao: {
        connection: 'app',
        collection: 'roles',
        indexes: [
            {fields: {name: 1, organisation: 1}, options: {unique: true}}
        ],
        saveAudit: false,
        isReadonly: true
    },
    model: {
        _id: Joi.object(),
        name: Joi.string().required(),
        organisation: Joi.string().required(),
        permissions: Joi.array().items(Joi.object().keys({
            action: Joi.string().only('view', 'update').required(),
            object: Joi.string().required()
        })).unique()
    }
};

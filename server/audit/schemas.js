'use strict';
import Joi from 'joi';
export default {
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
        find: {
            query: {
                by: Joi.string(),
                objectType: Joi.string(),
                objectChangedId: Joi.string(),
                onBefore: Joi.date().format('YYYY-MM-DD'),
                onAfter: Joi.date().format('YYYY-MM-DD')
            }
        },
        findOptions: {
            forPartial: [['by', 'by']],
            forDate: 'on',
            forExact: [['objectType', 'objectChangedType'], ['objectChangedId', 'objectChangedId']]
        }
    }
};

'use strict';
let Joi = require('joi');
module.exports = {
    model: Joi.object().keys({
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
    }),
    find: {
        query: {
            by: Joi.string(),
            objectType: Joi.string(),
            objectChangedId: Joi.string(),
            onBefore: Joi.date().format('YYYY-MM-DD'),
            onAfter: Joi.date().format('YYYY-MM-DD')
        }
    }
};
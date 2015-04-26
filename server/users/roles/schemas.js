'use strict';
let Joi = require('joi');
module.exports = {
    model: Joi.object().keys({
        _id: Joi.object(),
        name: Joi.string().required(),
        organisation: Joi.string().required(),
        permissions: Joi.array().items(Joi.object().keys({
            action: Joi.string().only('view', 'update').required(),
            object: Joi.string().required()
        })).unique()
    })
};
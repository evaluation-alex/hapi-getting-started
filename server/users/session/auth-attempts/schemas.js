'use strict';
let Joi = require('joi');
module.exports = {
    model: Joi.object().keys({
        _id: Joi.object(),
        email: Joi.string().required(),
        organisation: Joi.string().default('*'),
        ip: Joi.string().required(),
        time: Joi.date().required()
    }),
    find: {
        query: {
            ip: Joi.string(),
            email: Joi.string()
        }
    }
};
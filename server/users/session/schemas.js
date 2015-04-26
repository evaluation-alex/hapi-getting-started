'use strict';
let Joi = require('joi');
module.exports = {
    model: Joi.array().items(Joi.object().keys({
        ipaddress: Joi.string(),
        key: Joi.object(),
        expires: Joi.date()
    })),
    login: {
        payload: {
            email: Joi.string().required(),
            password: Joi.string().required()
        }
    }
};
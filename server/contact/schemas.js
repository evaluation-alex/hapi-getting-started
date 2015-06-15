'use strict';
let Joi = require('joi');
module.exports = {
    contact: {
        payload: {
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            message: Joi.string().required()
        }
    }
};
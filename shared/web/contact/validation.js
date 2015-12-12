'use strict';
const Joi = require('joi');
module.exports = {
    controller: {
        contact: {
            payload: {
                name: Joi.string().required(),
                email: Joi.string().email().required(),
                message: Joi.string().required()
            }
        }
    }
};

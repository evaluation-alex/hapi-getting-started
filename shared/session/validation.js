'use strict';
const Joi = require('joi');
module.exports = {
    controller: {
        login: {
            payload: {
                email: Joi.string().required(),
                password: Joi.string().required()
            }
        }
    }
};

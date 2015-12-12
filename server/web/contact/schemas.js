'use strict';
const Joi = require('joi');
//const shared = require('./../../../shared/web/contact/validation');
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

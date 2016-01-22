'use strict';
const Joi = require('joi');
module.exports = {
    controller: {
        find: {
            query: {
                ip: Joi.string(),
                email: Joi.string()
            }
        }
    }
};

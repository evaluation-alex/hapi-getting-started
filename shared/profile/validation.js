'use strict';
const Joi = require('joi');
module.exports = {
    controller: {
        update: {
            payload: {
                profile: {
                    firstName: Joi.string(),
                    lastName: Joi.string(),
                    preferredName: Joi.string(),
                    facebook: Joi.any(),
                    google: Joi.any(),
                    twitter: Joi.any()
                }
            }
        }
    }
};

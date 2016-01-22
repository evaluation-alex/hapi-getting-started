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
                    facebook: Joi.object(),
                    google: Joi.object(),
                    twitter: Joi.object()
                }
            }
        }
    }
};

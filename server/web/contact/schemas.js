'use strict';
import Joi from 'joi';
export default {
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

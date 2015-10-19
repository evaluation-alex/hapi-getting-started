'use strict';
import Joi from 'joi';
export default {
    dao: {
        isVirtualModel: true
    },
    model: Joi.array().items(Joi.object().keys({
        ipaddress: Joi.string(),
        key: Joi.object(),
        expires: Joi.date()
    })),
    controller: {
        login: {
            payload: {
                email: Joi.string().required(),
                password: Joi.string().required()
            }
        }
    }
};

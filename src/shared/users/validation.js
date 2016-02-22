'use strict';
module.exports = function (Joi) {
    return {
        controller: {
            signup: {
                payload: {
                    email: Joi.string().required(),
                    organisation: Joi.string().required(),
                    locale: Joi.string().only(['en', 'hi']).default('en'),
                    password: Joi.string().required()
                }
            },
            find: {
                query: {
                    email: Joi.string(),
                    isActive: Joi.string()
                }
            },
            update: {
                payload: {
                    isActive: Joi.boolean(),
                    roles: Joi.array().items(Joi.string()),
                    password: Joi.string()
                }
            },
            forgot: {
                payload: {
                    email: Joi.string().required()
                }
            },
            reset: {
                payload: {
                    key: Joi.string().required(),
                    email: Joi.string().required(),
                    password: Joi.string().required()
                }
            }
        }
    };
};

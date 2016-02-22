'use strict';
module.exports = function (Joi) {
    return {
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
};

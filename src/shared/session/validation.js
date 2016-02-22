'use strict';
module.exports = function (Joi) {
    return {
        controller: {
            login: {
                payload: {
                    email: Joi.string().required(),
                    password: Joi.string().required()
                }
            }
        }
    };
};

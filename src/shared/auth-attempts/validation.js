'use strict';
module.exports = function (Joi) {
    return {
        controller: {
            find: {
                query: {
                    ip: Joi.string(),
                    email: Joi.string()
                }
            }
        }
    };
};

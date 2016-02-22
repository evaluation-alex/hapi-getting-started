'use strict';
module.exports = function (Joi) {
    return {
        controller: {
            find: {
                query: {
                    title: Joi.string(),
                    state: Joi.string(),
                    objectType: Joi.string(),
                    createdOnBefore: Joi.date().format('YYYY-MM-DD'),
                    createdOnAfter: Joi.date().format('YYYY-MM-DD'),
                    isActive: Joi.string()
                }
            },
            update: {
                payload: {
                    starred: Joi.boolean(),
                    state: Joi.string().only(['read', 'unread']),
                    isActive: Joi.boolean()
                }
            }
        }
    };
};

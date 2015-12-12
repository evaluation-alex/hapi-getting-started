'use strict';
const Joi = require('joi');
module.exports = {
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
                state: Joi.string().only(['read', 'starred']),
                isActive: Joi.boolean()
            }
        }
    }
};

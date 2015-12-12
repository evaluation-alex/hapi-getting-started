'use strict';
const Joi = require('joi');
module.exports = {
    controller: {
        find: {
            query: {
                by: Joi.string(),
                objectType: Joi.string(),
                objectChangedId: Joi.string(),
                onBefore: Joi.date().format('YYYY-MM-DD'),
                onAfter: Joi.date().format('YYYY-MM-DD')
            }
        }
    }
};

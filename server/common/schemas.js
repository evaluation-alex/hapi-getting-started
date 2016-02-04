'use strict';
const Joi = require('joi');
module.exports = {
    model: {
        _id: [Joi.object(), Joi.string().regex(/^[0-9a-fA-F]{24}$/)],
        organisation: Joi.string(),
        isActive: Joi.boolean().default(true),
        createdBy: Joi.string(),
        createdOn: Joi.date(),
        updatedBy: Joi.string(),
        updatedOn: Joi.date(),
        objectVersion: Joi.number(),
        schemaVersion: Joi.number()
    }
};

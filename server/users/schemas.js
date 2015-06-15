'use strict';
let Joi = require('joi');
let session = require('./session/schemas').model;
let preferences = require('./preferences/schemas').model;
let profile = require('./profile/schemas').model;
module.exports = {
    model: Joi.object().keys({
        _id: Joi.object(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        organisation: Joi.string().required(),
        roles: Joi.array().items(Joi.string()).unique(),
        resetPwd: Joi.object().keys({
            token: Joi.string().required(),
            expires: Joi.date().required()
        }),
        session: session,
        preferences: preferences,
        profile: profile,
        isActive: Joi.boolean().default(true),
        createdBy: Joi.string(),
        createdOn: Joi.date(),
        updatedBy: Joi.string(),
        updatedOn: Joi.date()
    }),
    signup: {
        payload: {
            email: Joi.string().email().required(),
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
    loginForgot: {
        payload: {
            email: Joi.string().email().required()
        }
    },
    loginReset: {
        payload: {
            key: Joi.string().required(),
            email: Joi.string().email().required(),
            password: Joi.string().required()
        }
    }
};
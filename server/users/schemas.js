'use strict';
const Joi = require('joi');
const {model: session} = require('./session/schemas');
const {model: preferences} = require('./preferences/schemas');
const {model: profile} = require('./profile/schemas');
const shared = require('./../../shared/users/validation');
module.exports = {
    dao: {
        connection: 'app',
        collection: 'users',
        idForAudit: 'email',
        indexes: [
            {fields: {email: 1}, options: {unique: true}},
            {fields: {email: 1, organisation: 1}, options: {unique: true}}
        ],
        updateMethod: {
            method: 'updateUser',
            props: [
                'isActive',
                'roles'
            ]
        },
        saveAudit: true,
        nonEnumerables: ['audit', '_roles']
    },
    model: {
        _id: Joi.object(),
        email: Joi.string().required(),
        password: Joi.string().required(),
        organisation: Joi.string().required(),
        roles: Joi.array().items(Joi.string()).unique(),
        resetPwd: Joi.object().keys({
            token: Joi.string().required(),
            expires: Joi.date().required()
        }),
        session: session,
        preferences: Joi.object().keys(preferences),
        profile: Joi.object().keys(profile),
        isActive: Joi.boolean().default(true),
        createdBy: Joi.string(),
        createdOn: Joi.date(),
        updatedBy: Joi.string(),
        updatedOn: Joi.date()
    },
    controller: {
        signup: shared.controller.signup,
        find: shared.controller.find,
        findOptions: {
            forPartial: [['email', 'email']]
        },
        update: shared.controller.update,
        forgot: shared.controller.forgot,
        reset: shared.controller.reset
    }
};

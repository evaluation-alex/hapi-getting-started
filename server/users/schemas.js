'use strict';
const Joi = require('joi');
const session = require('./../session/schemas').model;
const preferences = require('./../preferences/schemas').model;
const profile = require('./../profile/schemas').model;
const shared = require('./../../shared/users/validation');
const common = require('./../common/schemas');
const _ = require('./../lodash');
const {merge} = _;
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
        nonEnumerables: ['audit', '_roles'],
        schemaVersion: 1
    },
    model: merge({}, {
        email: Joi.string().required(),
        password: Joi.string().required(),
        roles: Joi.array().items(Joi.string()).unique(),
        resetPwd: {
            token: Joi.string(),
            expires: Joi.date()
        },
        session: session,
        preferences: preferences,
        profile: profile
    }, common.model),
    controller: {
        signup: shared.controller.signup,
        find: shared.controller.find,
        findDefaults: {sort: '-updatedOn', limit: 8, page: 1},
        findOptions: {
            forPartial: [['email', 'email']]
        },
        update: shared.controller.update,
        forgot: shared.controller.forgot,
        reset: shared.controller.reset
    }
};

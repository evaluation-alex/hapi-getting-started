'use strict';
const Joi = require('joi');
const shared = require('./../../../../shared/users/session/auth-attempts/validation');
module.exports = {
    dao: {
        connection: 'app',
        collection: 'auth-attempts',
        indexes: [
            {fields: {ip: 1, email: 1}},
            {fields: {email: 1}}
        ],
        saveAudit: false,
        isReadonly: true,
        schemaVersion: 1
    },
    model: {
        _id: Joi.object(),
        email: Joi.string().required(),
        organisation: Joi.string().default('*'),
        ip: Joi.string().required(),
        time: Joi.date().required()
    },
    controller: {
        find: shared.controller.find,
        findDefaults: {sort: '-time', limit: 8, page: 1},
        findOptions: {
            forPartialMatch: [['ip', 'ip'], ['email', 'email']]
        }
    }
};

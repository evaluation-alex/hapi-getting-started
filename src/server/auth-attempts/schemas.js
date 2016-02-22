'use strict';
const Joi = require('joi');
const shared = require('./../../shared/auth-attempts/validation')(Joi);
const common = require('./../common/schemas');
const _ = require('./../lodash');
const {merge, pick} = _;
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
    model: merge({}, {
        email: Joi.string(),
        organisation: Joi.string().default('*'),
        ip: Joi.string(),
        time: Joi.date()
    }, pick(common.model, ['_id', 'organisation', 'schemaVersion', 'objectVersion'])),
    controller: {
        find: shared.controller.find,
        findDefaults: {sort: '-time', limit: 8, page: 1},
        findOptions: {
            forPartialMatch: [['ip', 'ip'], ['email', 'email']]
        }
    }
};

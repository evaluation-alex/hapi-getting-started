'use strict';
import Joi from 'joi';
export default {
    dao: {
        connection: 'app',
        collection: 'auth-attempts',
        indexes: [
            {fields: {ip: 1, email: 1}},
            {fields: {email: 1}}
        ],
        saveAudit: false,
        isReadonly: true
    },
    model: {
        _id: Joi.object(),
        email: Joi.string().required(),
        organisation: Joi.string().default('*'),
        ip: Joi.string().required(),
        time: Joi.date().required()
    },
    controller: {
        find: {
            query: {
                ip: Joi.string(),
                email: Joi.string()
            }
        },
        findOptions: {
            forPartialMatch: [['ip', 'ip'], ['email', 'email']]
        }
    }
};

'use strict';
import Joi from 'joi';
import {model as session} from './session/schemas';
import {model as preferences} from './preferences/schemas';
import {model as profile} from './profile/schemas';
export default {
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
        signup: {
            payload: {
                email: Joi.string().required(),
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
        findOptions: {
            forPartial: [['email', 'email']]
        },
        update: {
            payload: {
                isActive: Joi.boolean(),
                roles: Joi.array().items(Joi.string()),
                password: Joi.string()
            }
        },
        forgot: {
            payload: {
                email: Joi.string().required()
            }
        },
        reset: {
            payload: {
                key: Joi.string().required(),
                email: Joi.string().required(),
                password: Joi.string().required()
            }
        }
    }
};

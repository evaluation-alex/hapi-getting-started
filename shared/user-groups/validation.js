'use strict';
const Joi = require('joi');
module.exports = {
    controller: {
        create: {
            payload: {
                name: Joi.string().required(),
                members: Joi.array().items(Joi.string()),
                owners: Joi.array().items(Joi.string()),
                description: Joi.string(),
                access: Joi.string().only(['restricted', 'public'])
            }
        },
        find: {
            query: {
                email: Joi.string(),
                groupName: Joi.string(),
                isActive: Joi.string()
            }
        },
        update: {
            payload: {
                isActive: Joi.boolean(),
                addedMembers: Joi.array().items(Joi.string()).unique(),
                removedMembers: Joi.array().items(Joi.string()).unique(),
                addedOwners: Joi.array().items(Joi.string()).unique(),
                removedOwners: Joi.array().items(Joi.string()).unique(),
                description: Joi.string(),
                access: Joi.string().only(['restricted', 'public'])
            }
        },
        approve: {
            payload: {
                addedMembers: Joi.array().items(Joi.string()).unique()
            }
        },
        reject: {
            payload: {
                addedMembers: Joi.array().items(Joi.string()).unique()
            }
        }
    }
};

'use strict';
import Joi from 'joi';
export default {
    dao: {
        connection: 'app',
        collection: 'user-groups',
        indexes: [
            {fields: {name: 1, organisation: 1}, options: {unique: true}}
        ],
        updateMethod: {
            method: 'update',
            props: [
                'isActive',
                'description',
                'access'
            ],
            arrProps: [
                'owners',
                'members',
                'needsApproval'
            ]
        },
        saveAudit: true,
        joinApproveRejectLeave: {
            affectedRole: 'members',
            needsApproval: 'needsApproval'
        }
    },
    model: {
        _id: Joi.object(),
        name: Joi.string().required(),
        organisation: Joi.string().required(),
        description: Joi.string(),
        members: Joi.array().items(Joi.string()).unique(),
        owners: Joi.array().items(Joi.string()).unique(),
        needsApproval: Joi.array().items(Joi.string()).unique(),
        access: Joi.string().only(['restricted', 'public']).default('restricted'),
        isActive: Joi.boolean().default(true),
        createdBy: Joi.string(),
        createdOn: Joi.date(),
        updatedBy: Joi.string(),
        updatedOn: Joi.date()
    },
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
            approve: {
                payload: {
                    addedMembers: Joi.array().items(Joi.string()).unique()
                }
            }
        }}
};

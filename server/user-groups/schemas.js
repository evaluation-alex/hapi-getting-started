'use strict';
const Joi = require('joi');
const shared = require('./../../shared/user-groups/validation');
module.exports = {
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
        },
        nonEnumerables: ['audit']
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
        create: shared.controller.create,
        find: shared.controller.find,
        findOptions: {
            forPartial: [['email', 'members'], ['groupName', 'name']]
        },
        update: shared.controller.update,
        approve: shared.controller.approve,
        reject: shared.controller.reject
    }
};

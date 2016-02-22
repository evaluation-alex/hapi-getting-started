'use strict';
const Joi = require('joi');
const shared = require('./../../shared/user-groups/validation')(Joi);
const common = require('./../common/schemas');
const _ = require('./../lodash');
const {merge} = _;
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
        nonEnumerables: ['audit'],
        schemaVersion: 1
    },
    model: merge({}, {
        name: Joi.string(),
        description: Joi.string(),
        members: Joi.array().items(Joi.string()).unique(),
        owners: Joi.array().items(Joi.string()).unique(),
        needsApproval: Joi.array().items(Joi.string()).unique(),
        access: Joi.string().only(['restricted', 'public']).default('restricted')
    }, common.model),
    controller: {
        create: shared.controller.create,
        find: shared.controller.find,
        findDefaults: {sort: '-updatedOn', limit: 8, page: 1},
        findOptions: {
            forPartial: [['email', 'members'], ['groupName', 'name']]
        },
        update: shared.controller.update,
        approve: shared.controller.approve,
        reject: shared.controller.reject
    }
};

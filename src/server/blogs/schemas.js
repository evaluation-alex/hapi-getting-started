'use strict';
const Joi = require('joi');
const shared = require('./../../shared/blogs/validation')(Joi);
const common = require('./../common/schemas');
const _ = require('./../lodash');
const {merge} = _;
module.exports = {
    dao: {
        connection: 'app',
        collection: 'blogs',
        idForAudit: undefined,
        indexes: [
            {fields: {title: 1, organisation: 1}, options: {unique: true}},
            {fields: {description: 1}}
        ],
        updateMethod: {
            method: 'update',
            props: [
                'isActive',
                'description',
                'needsReview',
                'access',
                'allowComments',
                'title'
            ],
            arrProps: [
                'owners',
                'contributors',
                'subscribers',
                'subscriberGroups',
                'needsApproval'
            ]
        },
        joinApproveRejectLeave: {
            affectedRole: 'subscribers',
            needsApproval: 'needsApproval'
        },
        saveAudit: true,
        nonEnumerables: ['audit'],
        schemaVersion: 1
    },
    model: merge({}, {
        title: Joi.string(),
        description: Joi.string(),
        owners: Joi.array().items(Joi.string()).unique(),
        contributors: Joi.array().items(Joi.string()).unique(),
        subscribers: Joi.array().items(Joi.string()).unique(),
        subscriberGroups: Joi.array().items(Joi.string()).unique(),
        needsApproval: Joi.array().items(Joi.string()).unique(),
        needsReview: Joi.boolean().default(false),
        access: Joi.string().only(['public', 'restricted']),
        allowComments: Joi.boolean().default(true)
    }, common.model),
    controller: {
        create: shared.controller.create,
        find: shared.controller.find,
        findDefaults: {sort: '-updatedOn', limit: 8, page: 1},
        findOptions: {
            forPartial: [['title', 'title'], ['owner', 'owners'], ['contributor', 'contributors'], ['subscriber', 'subscribers'],
                ['subGroup', 'subscriberGroups']]
        },
        update: shared.controller.update,
        approve: shared.controller. approve,
        reject: shared.controller.reject
    }
};
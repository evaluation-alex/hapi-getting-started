'use strict';
const Joi = require('joi');
const shared = require('./../../../shared/users/notifications/validation');
module.exports = {
    dao: {
        connection: 'app',
        collection: 'notifications',
        indexes: [
            {fields: {objectType: 1, objectId: 1, state: 1, action: 1}},
            {fields: {email: 1, objectType: 1, objectId: 1, createdOn: 1}}
        ],
        updateMethod: {
            method: 'update',
            props: [
                'state',
                'isActive'
            ]
        },
        saveAudit: true,
        i18n: ['title', 'content'],
        nonEnumerables: [],
        schemaVersion: 1
    },
    model: {
        _id: Joi.object(),
        email: Joi.string().email().required(),
        organisation: Joi.string().required(),
        objectType: Joi.string().only(['user-groups', 'posts', 'blogs', 'comments']).required(),
        objectId: Joi.object().required(),
        title: Joi.array().items(Joi.string()),
        state: Joi.string().only(['unread', 'starred', 'read', 'cancelled']).default('unread').required(),
        action: Joi.string(),
        priority: Joi.string().only(['critical', 'medium', 'low']),
        content: Joi.object(),
        isActive: Joi.boolean().default(true),
        createdBy: Joi.string(),
        createdOn: Joi.date(),
        updatedBy: Joi.string(),
        updatedOn: Joi.date()
    },
    controller: {
        find: shared.controller.find,
        findDefaults: {sort: '-updatedOn', limit: 8, page: 1},
        findOptions: {
            forPartial: [['state', 'state'], ['objectType', 'objectType']],
            forDateBefore: [['createdOnBefore', 'createdOn']],
            forDateAfter: [['createdOnAfter', 'createdOn']]
        },
        update: shared.controller.update
    }
};

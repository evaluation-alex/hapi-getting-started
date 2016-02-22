'use strict';
const Joi = require('joi');
const shared = require('./../../shared/notifications/validation')(Joi);
const common = require('./../common/schemas');
const _ = require('./../lodash');
const {merge} = _;
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
                'isActive',
                'starred'
            ]
        },
        saveAudit: true,
        i18n: ['title', 'content'],
        nonEnumerables: [],
        schemaVersion: 1
    },
    model: merge({}, {
        email: Joi.string(),
        objectType: Joi.string().only(['user-groups', 'posts', 'recipes', 'meals', 'blogs', 'comments']),
        objectId: [Joi.object(), Joi.string().regex(/^[0-9a-fA-F]{24}$/), Joi.string()],
        title: [Joi.array(), Joi.string()],
        state: Joi.string().only(['unread', 'starred', 'read', 'cancelled']).default('unread'),
        starred: Joi.boolean().default(false),
        action: Joi.string(),
        priority: Joi.string().only(['critical', 'medium', 'low']),
        content: Joi.any(),
        audit: Joi.any()//stupid hack, dont know how to rid of it
    }, common.model),
    controller: {
        find: shared.controller.find,
        findDefaults: {sort: '-updatedOn', limit: 8, page: 1},
        findOptions: {
            forPartial: [['state', 'state'], ['objectType', 'objectType'], ['title', 'title.1.title']],
            forDateBefore: [['createdOnBefore', 'createdOn']],
            forDateAfter: [['createdOnAfter', 'createdOn']]
        },
        update: shared.controller.update
    }
};

'use strict';
import Joi from 'joi';
export default {
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
        nonEnumerables: []
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
        find: {
            query: {
                title: Joi.string(),
                state: Joi.string(),
                objectType: Joi.string(),
                createdOnBefore: Joi.date().format('YYYY-MM-DD'),
                createdOnAfter: Joi.date().format('YYYY-MM-DD'),
                isActive: Joi.string()
            }
        },
        findOptions: {
            forPartial: [['state', 'state'], ['objectType', 'objectType']],
            forDateRange: 'createdOn'
        },
        update: {
            payload: {
                state: Joi.string().only(['read', 'starred']),
                isActive: Joi.boolean()
            }
        }
    }
};

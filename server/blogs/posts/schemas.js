'use strict';
const Joi = require('joi');
const shared = require('./../../../shared/blogs/posts/validation');
module.exports = {
    dao: {
        connection: 'app',
        collection: 'posts',
        indexes: [
            {fields: {organisation: 1, title: 1, blogId: 1, publishedOn: 1}},
            {fields: {tags: 1}},
            {fields: {state: 1, publishedOn: 1}}
        ],
        updateMethod: {
            method: 'updatePost',
            props: [
                'isActive',
                'state',
                'category',
                'title',
                'access',
                'allowComments',
                'needsReview',
                'content'
            ],
            arrProps: [
                'tags',
                'attachments'
            ]
        },
        saveAudit: true,
        nonEnumerables: ['audit']
    },
    model: {
        _id: Joi.object(),
        blogId: Joi.object().required(),
        organisation: Joi.string().required(),
        title: Joi.string().required(),
        state: Joi.string().only(['draft', 'pending review', 'published', 'archived', 'do not publish']).default('draft'),
        access: Joi.string().only(['public', 'restricted']).default('public'),
        allowComments: Joi.boolean().default(true),
        needsReview: Joi.boolean().default(false),
        category: Joi.string(),
        tags: Joi.array().items(Joi.string()).unique(),
        attachments: Joi.array().items(Joi.object()).unique(),
        contentType: Joi.string().only(['post']).default('post'),
        content: Joi.alternatives().try(Joi.string()),
        publishedBy: Joi.string(),
        publishedOn: Joi.date(),
        reviewedBy: Joi.string(),
        reviewedOn: Joi.date(),
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
            forPartial: [['title', 'title'], ['tag', 'tags'], ['publishedBy', 'publishedBy'], ['state', 'state']],
            forDateBefore: [['publishedOnBefore', 'publishedOn']],
            forDateAfter: [['publishedOnAfter', 'publishedOn']],
            forID: [['blogId', 'blogId']]
        },
        update: shared.controller.update,
        publish: shared.controller.publish,
        reject: shared.controller.reject
    }
};

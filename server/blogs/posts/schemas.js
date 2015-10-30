'use strict';
import Joi from 'joi';
export default {
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
        title: Joi.string(),
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
        create: {
            payload: {
                blogId: Joi.string(),
                title: Joi.string(),
                state: Joi.string().only(['draft', 'pending review', 'published', 'archived']),
                tags: Joi.array().items(Joi.string()).unique(),
                category: Joi.string(),
                attachments: Joi.array().items(Joi.object()).unique(),
                access: Joi.string().only(['public', 'restricted']),
                allowComments: Joi.boolean(),
                needsReview: Joi.boolean(),
                content: Joi.alternatives().try(Joi.string(), Joi.object())
            }
        },
        find: {
            query: {
                title: Joi.string(),
                blogId: Joi.string(),
                blogTitle: Joi.string(),
                tag: Joi.string(),
                contentType: Joi.string().only('post', 'recipe', 'meal'),
                category: Joi.string(),
                description: Joi.string(),
                ingredient: Joi.string(),
                mealType: Joi.string(),
                publishedBy: Joi.string(),
                publishedOnBefore: Joi.date().format('YYYY-MM-DD'),
                publishedOnAfter: Joi.date().format('YYYY-MM-DD'),
                isActive: Joi.string(),
                state: Joi.string()
            }
        },
        findOptions: {
            forPartial: [['title', 'title'], ['tag', 'tags'], ['publishedBy', 'publishedBy'], ['state', 'state']],
            forDateRange: 'publishedOn',
            forID: [['blogId', 'blogId']]
        },
        update: {
            payload: {
                blogId: Joi.string(),
                isActive: Joi.boolean(),
                addedTags: Joi.array().items(Joi.string()).unique(),
                removedTags: Joi.array().items(Joi.string()).unique(),
                addedAttachments: Joi.array().items(Joi.string()).unique(),
                removedAttachments: Joi.array().items(Joi.string()).unique(),
                title: Joi.string(),
                content: Joi.alternatives().try(Joi.string(), Joi.object()),
                access: Joi.string().only(['public', 'restricted']),
                allowComments: Joi.boolean(),
                needsReview: Joi.boolean()
            }
        },
        publish: {
            payload: {
                blogId: Joi.string()
            }
        },
        reject: {
            payload: {
                blogId: Joi.string()
            }
        }
    }
};

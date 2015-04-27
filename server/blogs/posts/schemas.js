'use strict';
let Joi = require('joi');
module.exports = {
    model: Joi.object().keys({
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
    }),
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
            contentType: Joi.string().only(['post']).default('post'),
            content: Joi.alternatives().try(Joi.string())
        }
    },
    find: {
        query: {
            title: Joi.string(),
            blogId: Joi.string(),
            tag: Joi.string(),
            publishedBy: Joi.string(),
            publishedOnBefore: Joi.date().format('YYYY-MM-DD'),
            publishedOnAfter: Joi.date().format('YYYY-MM-DD'),
            isActive: Joi.string(),
            state: Joi.string()
        }
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
            content: Joi.string(),
            access: Joi.string().only(['public', 'restricted']),
            allowComments: Joi.boolean()
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
};
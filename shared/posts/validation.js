'use strict';
const Joi = require('joi');
module.exports = {
    controller: {
        create: {
            payload: {
                blogId: Joi.string(),
                title: Joi.string().required(),
                state: Joi.string().only(['draft', 'pending review', 'published', 'archived']).required(),
                tags: Joi.array().items(Joi.string()).unique(),
                attachments: Joi.array().items([Joi.object(), Joi.string()]).unique(),
                access: Joi.string().only(['public', 'restricted']),
                allowComments: Joi.boolean(),
                needsReview: Joi.boolean(),
                contentType: Joi.string().only(['post']).default('post').required(),
                content: [Joi.string(), Joi.object()]
            }
        },
        find: {
            query: {
                title: Joi.string(),
                blogId: [Joi.array().items(Joi.string()), Joi.string()],
                blogTitle: Joi.string(),
                tag: Joi.string(),
                contentType: Joi.string().only(['post']).default('post'),
                description: Joi.string(),
                state: Joi.string(),
                publishedBy: Joi.string(),
                publishedOnBefore: Joi.date().format('YYYY-MM-DD'),
                publishedOnAfter: Joi.date().format('YYYY-MM-DD'),
                isActive: Joi.string()
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
                contentType: Joi.string().only(['post']).default('post'),
                content: Joi.string(),
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

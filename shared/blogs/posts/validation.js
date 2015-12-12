'use strict';
const Joi = require('joi');
module.exports = {
    controller: {
        create: {
            payload: {
                blogId: Joi.string(),
                title: Joi.string().required(),
                state: Joi.string().only(['draft', 'pending review', 'published', 'archived']),
                tags: Joi.array().items(Joi.string()).unique(),
                category: Joi.string(),
                attachments: Joi.array().items(Joi.object()).unique(),
                access: Joi.string().only(['public', 'restricted']),
                allowComments: Joi.boolean(),
                needsReview: Joi.boolean(),
                contentType: Joi.string().only(['meal', 'recipe', 'post']).default('post'),
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
        update: {
            payload: {
                blogId: Joi.string(),
                isActive: Joi.boolean(),
                addedTags: Joi.array().items(Joi.string()).unique(),
                removedTags: Joi.array().items(Joi.string()).unique(),
                addedAttachments: Joi.array().items(Joi.string()).unique(),
                removedAttachments: Joi.array().items(Joi.string()).unique(),
                title: Joi.string(),
                contentType: Joi.string().only(['meal', 'recipe', 'post']).default('post'),
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

'use strict';
module.exports = function (Joi) {
    return {
        controller: {
            create: {
                payload: {
                    title: Joi.string().required(),
                    description: Joi.string().required(),
                    owners: Joi.array().items(Joi.string()).unique().required(),
                    contributors: Joi.array().items(Joi.string()).unique(),
                    subscribers: Joi.array().items(Joi.string()).unique(),
                    subscriberGroups: Joi.array().items(Joi.string()).unique(),
                    needsReview: Joi.boolean().default(false),
                    access: Joi.string().only(['public', 'restricted']).default('public'),
                    allowComments: Joi.boolean().default(true)
                }
            },
            find: {
                query: {
                    title: Joi.string(),
                    owner: Joi.string(),
                    contributor: Joi.string(),
                    subscriber: Joi.string(),
                    subGroup: Joi.string(),
                    isActive: Joi.string()
                }
            },
            update: {
                payload: {
                    title: Joi.string(),
                    isActive: Joi.boolean(),
                    addedOwners: Joi.array().items(Joi.string()).unique(),
                    removedOwners: Joi.array().items(Joi.string()).unique(),
                    addedContributors: Joi.array().items(Joi.string()).unique(),
                    removedContributors: Joi.array().items(Joi.string()).unique(),
                    addedSubscribers: Joi.array().items(Joi.string()).unique(),
                    removedSubscribers: Joi.array().items(Joi.string()).unique(),
                    addedSubscriberGroups: Joi.array().items(Joi.string()).unique(),
                    removedSubscriberGroups: Joi.array().items(Joi.string()).unique(),
                    description: Joi.string(),
                    needsReview: Joi.boolean(),
                    access: Joi.string().only(['public', 'restricted']),
                    allowComments: Joi.boolean()
                }
            },
            approve: {
                payload: {
                    addedSubscribers: Joi.array().items(Joi.string()).unique()
                }
            },
            reject: {
                payload: {
                    addedSubscribers: Joi.array().items(Joi.string()).unique()
                }
            }
        }
    };
};

'use strict';
import Joi from 'joi';
export default {
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
        nonEnumerables: ['audit']
    },
    model: {
        _id: Joi.object(),
        title: Joi.string().required(),
        organisation: Joi.string().required(),
        description: Joi.string(),
        owners: Joi.array().items(Joi.string()).unique(),
        contributors: Joi.array().items(Joi.string()).unique(),
        subscribers: Joi.array().items(Joi.string()).unique(),
        subscriberGroups: Joi.array().items(Joi.string()).unique(),
        needsApproval: Joi.array().items(Joi.string()).unique(),
        needsReview: Joi.boolean().default(false),
        access: Joi.string().only(['public', 'restricted']),
        allowComments: Joi.boolean().default(true),
        isActive: Joi.boolean().default(true),
        createdBy: Joi.string(),
        createdOn: Joi.date(),
        updatedBy: Joi.string(),
        updatedOn: Joi.date()
    },
    controller: {
        create: {
            payload: {
                title: Joi.string(),
                description: Joi.string(),
                owners: Joi.array().items(Joi.string()).unique(),
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
        findOptions: {
            forPartial: [['title', 'title'], ['owner', 'owners'], ['contributor', 'contributors'], ['subscriber', 'subscribers'],
                ['subGroup', 'subscriberGroups']]
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
            approve: {
                payload: {
                    addedSubscribers: Joi.array().items(Joi.string()).unique()
                }
            }
        }
    }
};

'use strict';
module.exports = function (Joi, _) {
    const mongoId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
    const common = {
        model: {
            _id: [Joi.object(), mongoId],
            organisation: Joi.string(),
            isActive: Joi.boolean().default(true),
            createdBy: Joi.string(),
            createdOn: Joi.date(),
            updatedBy: Joi.string(),
            updatedOn: Joi.date(),
            objectVersion: Joi.number(),
            schemaVersion: Joi.number()
        }
    };
    const enums = {
        channel: {
            frequency: ['none', 'immediate', 'daily', 'weekly']
        },
        blogs: {
            access: ['public', 'restricted']
        },
        posts: {
            state: ['draft', 'pending review', 'published', 'archived', 'do not publish'],
            contentType: ['post', 'meal', 'recipe']
        },
        preferences: {
            locale: ['en', 'hi']
        },
        notifications: {
            objectType: ['user-groups', 'posts', 'blogs', 'comments'],
            state: ['unread', 'read', 'cancelled'],
            priority: ['critical', 'medium', 'low']
        },
        roles: {
            action: ['view', 'update']
        }
    };
    const channel = {
        frequency: Joi.string().only(enums.channel.frequency),
        lastSent: Joi.date().optional()
    };
    const notificationPref = {
        inapp: channel,
        email: channel,
        blocked: Joi.array().items([Joi.object(), mongoId, Joi.string()]).optional()
    };
    const posts = _.merge({}, {
        blogId: [Joi.object(), mongoId],
        access: Joi.string().only(enums.blogs.access).default('public'),
        allowComments: Joi.boolean().default(true),
        needsReview: Joi.boolean().default(false),
        title: Joi.string(),
        state: Joi.string().only(enums.posts.state).default('draft'),
        tags: Joi.array().items(Joi.string()).unique(),
        attachments: Joi.array().items(Joi.any()).unique(),
        contentType: Joi.string().only(enums.posts.contentType).default('post'),
        content: [Joi.string(), Joi.object()],
        publishedBy: Joi.string(),
        publishedOn: Joi.date(),
        reviewedBy: Joi.string(),
        reviewedOn: Joi.date()
    }, common.model);
    const preferences = {
        notifications: {
            blogs: notificationPref,
            posts: notificationPref,
            userGroups: notificationPref
        },
        locale: Joi.string().only(enums.preferences.locale)
    };
    const profile = {
        firstName: Joi.string(),
        lastName: Joi.string(),
        preferredName: Joi.string(),
        facebook: Joi.any(),
        google: Joi.any(),
        twitter: Joi.any()
    };
    const session = Joi.array().items({
        ipaddress: Joi.string(),
        key: Joi.string(),
        expires: Joi.date()
    });
    return {
        subdocuments: {
            enums,
            mongoId,
            notificationPref
        },
        audit: _.merge({}, {
            objectChangedType: Joi.string(),
            objectChangedId: [Joi.object(), mongoId, Joi.string()],
            by: Joi.string(),
            on: Joi.date(),
            change: Joi.array().items({
                action: Joi.string(),
                origValues: Joi.any(),
                newValues: Joi.any()
            })
        }, _.pick(common.model, ['_id', 'organisation', 'objectVersion', 'schemaVersion'])),
        'auth-attempts': _.merge({}, {
            email: Joi.string(),
            organisation: Joi.string().default('*'),
            ip: Joi.string(),
            time: Joi.date()
        }, _.pick(common.model, ['_id', 'organisation', 'schemaVersion', 'objectVersion'])),
        blogs: _.merge({}, {
            title: Joi.string(),
            description: Joi.string(),
            owners: Joi.array().items(Joi.string()).unique(),
            contributors: Joi.array().items(Joi.string()).unique(),
            subscribers: Joi.array().items(Joi.string()).unique(),
            subscriberGroups: Joi.array().items(Joi.string()).unique(),
            needsApproval: Joi.array().items(Joi.string()).unique(),
            needsReview: Joi.boolean().default(false),
            access: Joi.string().only(enums.blogs.access),
            allowComments: Joi.boolean().default(true)
        }, common.model),
        notifications: _.merge({}, {
            email: Joi.string(),
            objectType: Joi.string().only(enums.notifications.objectType),
            objectId: [Joi.object(), mongoId, Joi.string()],
            title: [Joi.array(), Joi.string()],
            state: Joi.string().only(enums.notifications.state).default('unread'),
            starred: Joi.boolean().default(false),
            action: Joi.string(),
            priority: Joi.string().only(enums.notifications.priority),
            content: Joi.any(),
            audit: Joi.any()//stupid hack, dont know how to rid of it
        }, common.model),
        posts,
        preferences,
        profile,
        roles: _.merge({}, {
            name: Joi.string(),
            permissions: Joi.array().items({
                action: Joi.string().only(enums.roles.action),
                object: Joi.string()
            }).unique()
        }, common.model),
        session,
        'user-groups': _.merge({}, {
            name: Joi.string(),
            description: Joi.string(),
            members: Joi.array().items(Joi.string()).unique(),
            owners: Joi.array().items(Joi.string()).unique(),
            needsApproval: Joi.array().items(Joi.string()).unique(),
            access: Joi.string().only(enums.blogs.access).default('restricted')
        }, common.model),
        users: _.merge({}, {
            email: Joi.string().required(),
            password: Joi.string().required(),
            roles: Joi.array().items(Joi.string()).unique(),
            resetPwd: {
                token: Joi.string(),
                expires: Joi.date()
            },
            session: session,
            preferences: preferences,
            profile: profile
        }, common.model)
    };
};

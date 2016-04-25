'use strict';
module.exports = function(Joi, _) {
    const subdocs = require('./model')(Joi, _).subdocuments;
    const common = {
        update: {
            params: {
                id: subdocs.mongoId
            }
        },
        findDefaults: {
            payload: {
                pagination: {
                    fields: Joi.string(),
                    sort: Joi.string().default('-updatedOn'),
                    limit: Joi.number().default(8),
                    page: Joi.number().default(1)
                },
                isActive: Joi.boolean().default(true)
            }
        },
        findOne: {
            params: {
                id: subdocs.mongoId
            }
        }
    };
    const blogqry = {
        title: [Joi.array().items(Joi.string()), Joi.string()],
        owner: [Joi.array().items(Joi.string()), Joi.string()],
        contributor: [Joi.array().items(Joi.string()), Joi.string()],
        subscriber: [Joi.array().items(Joi.string()), Joi.string()]
    };
    const posts = {
        create: {
            payload: {
                blogId: subdocs.mongoId,
                title: Joi.string().required(),
                state: Joi.string().only(subdocs.enums.posts.state).required(),
                tags: Joi.array().items(Joi.string()).unique(),
                attachments: Joi.array().items([Joi.object(), Joi.string()]).unique(),
                access: Joi.string().only(subdocs.enums.blogs.access),
                allowComments: Joi.boolean(),
                needsReview: Joi.boolean(),
                contentType: Joi.string().only(['post']).default('post').required(),
                content: [Joi.string(), Joi.object()]
            }
        },
        findOptions: {
            forExact: [['contentType', 'contentType'], ['state', 'state'], ['access', 'access']],
            forPartial: [['title', 'title'], ['tag', 'tags'], ['publishedBy', 'publishedBy']],
            forDateBefore: [['publishedOnBefore', 'publishedOn']],
            forDateAfter: [['publishedOnAfter', 'publishedOn']],
            forID: [['blogId', 'blogId']]
        },
        find: _.merge({
            payload: {
                title: [Joi.array().items(Joi.string()), Joi.string()],
                blogId: [Joi.array().items(subdocs.mongoId), subdocs.mongoId],
                blogTitle: [Joi.array().items(Joi.string()), Joi.string()],
                tag: [Joi.array().items(Joi.string()), Joi.string()],
                contentType: Joi.string().only(['post']).default('post').notes(['exact match required']),
                description: [Joi.array().items(Joi.string()), Joi.string()],
                state: [Joi.array().items(Joi.string().only(subdocs.enums.posts.state)).notes(['exact match required']), Joi.string().only(subdocs.enums.posts.state).notes(['exact match required'])],
                publishedBy: [Joi.array().items(Joi.string()), Joi.string()],
                publishedOnBefore: Joi.date().format('YYYY-MM-DD'),
                publishedOnAfter: Joi.date().format('YYYY-MM-DD'),
                $or: {
                    blogId: [Joi.array().items(subdocs.mongoId), subdocs.mongoId],
                    access: Joi.string().only(['public'])
                }
            }
        }, common.findDefaults),
        findOne: common.findOne,
        update: _.merge({
            payload: {
                blogId: subdocs.mongoId,
                title: Joi.string(),
                state: Joi.string().only(subdocs.enums.posts.state),
                isActive: Joi.boolean(),
                addedTags: Joi.array().items(Joi.string()).unique(),
                removedTags: Joi.array().items(Joi.string()).unique(),
                addedAttachments: Joi.array().items(Joi.string()).unique(),
                removedAttachments: Joi.array().items(Joi.string()).unique(),
                contentType: Joi.string().only(['post']).default('post'),
                content: Joi.string(),
                access: Joi.string().only(subdocs.enums.blogs.access),
                allowComments: Joi.boolean(),
                needsReview: Joi.boolean()
            }
        }, common.update),
        publish: _.merge({
            payload: {
                blogId: subdocs.mongoId
            }
        }, common.update),
        reject: _.merge({
            payload: {
                blogId: subdocs.mongoId
            }
        }, common.update),
        delete: _.merge({
            payload: {
                blogId: subdocs.mongoId
            }
        }, common.update)
    };
    const updateChannel = {
        frequency: Joi.string().only(subdocs.enums.channel.frequency)
    };
    const notificationUpdatePref = {
        inapp: updateChannel,
        email: updateChannel,
        addedBlocked: Joi.array().items([Joi.object(), subdocs.mongoId]),
        removedBlocked: Joi.array().items([Joi.object(), subdocs.mongoId])
    };
    return {
        audit: {
            findOptions: {
                forPartial: [['by', 'by']],
                forDateBefore: [['onBefore', 'on']],
                forDateAfter: [['onAfter', 'on']],
                forExact: [['objectType', 'objectChangedType'], ['objectChangedId', 'objectChangedId']]
            },
            find: _.merge({
                payload: {
                    pagination: {
                        sort: Joi.string().default('-on'),
                        limit: Joi.number().default(5),
                        page: Joi.number().default(1)
                    }
                }
            }, {
                payload: {
                    by: [Joi.array().items(Joi.string()), Joi.string()],
                    objectType: [Joi.array().items(Joi.string()), Joi.string()],
                    objectChangedId: [Joi.array().items(Joi.string()), Joi.string()],
                    onBefore: Joi.date().format('YYYY-MM-DD'),
                    onAfter: Joi.date().format('YYYY-MM-DD')
                }
            })
        },
        'auth-attempts': {
            findOptions: {
                forPartialMatch: [['ip', 'ip'], ['email', 'email']]
            },
            find: _.merge({
                payload: {
                    pagination: {
                        sort: Joi.string().default('-time'),
                        limit: Joi.number().default(8),
                        page: Joi.number().default(1)
                    }
                }
            }, {
                payload: {
                    ip: [Joi.array().items(Joi.string()), Joi.string()],
                    email: [Joi.array().items(Joi.string()), Joi.string()]
                }
            })
        },
        blogs: {
            create: {
                payload: {
                    title: Joi.string().required(),
                    description: Joi.string().required(),
                    owners: Joi.array().items(Joi.string()).unique().required(),
                    contributors: Joi.array().items(Joi.string()).unique(),
                    subscribers: Joi.array().items(Joi.string()).unique(),
                    subscriberGroups: Joi.array().items(Joi.string()).unique(),
                    needsReview: Joi.boolean().default(false),
                    access: Joi.string().only(subdocs.enums.blogs.access).default('public'),
                    allowComments: Joi.boolean().default(true)
                }
            },
            findOptions: {
                forPartial: [['title', 'title'], ['owner', 'owners'], ['contributor', 'contributors'], ['subscriber', 'subscribers'],
                    ['subGroup', 'subscriberGroups']]
            },
            find: _.merge({
                payload: _.merge({}, blogqry, {$or: blogqry})
            }, common.findDefaults),
            findOne: common.findOne,
            update: _.merge({
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
                    access: Joi.string().only(subdocs.enums.blogs.access),
                    allowComments: Joi.boolean()
                }
            }, common.update),
            approve: _.merge({
                payload: {
                    addedSubscribers: Joi.array().items(Joi.string()).unique()
                }
            }, common.update),
            reject: _.merge({
                payload: {
                    addedSubscribers: Joi.array().items(Joi.string()).unique()
                }
            }, common.update),
            join: common.update,
            leave: common.update,
            delete: common.update
        },
        contact: {
            contact: {
                payload: {
                    name: Joi.string().required(),
                    email: Joi.string().email().required(),
                    message: Joi.string().required()
                }
            }
        },
        notifications: {
            findOptions: {
                forExact: [['state', 'state'], ['objectType', 'objectType']],
                forPartial: [['title', 'title.1.title']],
                forDateBefore: [['createdOnBefore', 'createdOn']],
                forDateAfter: [['createdOnAfter', 'createdOn']]
            },
            find: _.merge({
                payload: {
                    title: [Joi.array().items(Joi.string()), Joi.string()],
                    state: [Joi.array().items(Joi.string().only(subdocs.enums.notifications.state)).notes(['exact match required']), Joi.string().only(subdocs.enums.notifications.state).notes(['exact match required'])],
                    objectType: [Joi.array().items(Joi.string().only(subdocs.enums.notifications.objectType)), Joi.string().only(subdocs.enums.notifications.objectType)],
                    createdOnBefore: Joi.date().format('YYYY-MM-DD'),
                    createdOnAfter: Joi.date().format('YYYY-MM-DD')
                }
            }, common.findDefaults),
            update: _.merge({
                payload: {
                    starred: Joi.boolean(),
                    state: Joi.string().only(subdocs.enums.notifications.state),
                    isActive: Joi.boolean()
                }
            }, common.update)
        },
        posts,
        'posts-stats': {
            incrementFindOptions: {
                forID: [['postId', 'postId']]
            },
            incrementView: {
                payload: {
                    postId: subdocs.mongoId
                }
            },
            rate: {
                payload: {
                    postId: subdocs.mongoId,
                    rating: Joi.string().only(subdocs.enums.posts.rating)
                }
            }
        },
        'posts-comments': {
            create: {
                payload: {
                    postId: subdocs.mongoId,
                    comment: Joi.string(),
                    replyTo: subdocs.mongoId
                }
            },
            update: _.merge({
                payload: {
                    comment: Joi.string()
                }
            }, common.update),
            delete: common.update,
            approve: common.update,
            spam: common.update
        },
        preferences: {
            update: _.merge({
                payload: {
                    preferences: {
                        notifications: {
                            blogs: notificationUpdatePref,
                            posts: notificationUpdatePref,
                            userGroups: notificationUpdatePref
                        },
                        locale: Joi.string().only(subdocs.enums.preferences.locale)
                    }
                }
            }, common.update)
        },
        profile: {
            update: _.merge({
                payload: {
                    profile: {
                        firstName: Joi.string(),
                        lastName: Joi.string(),
                        preferredName: Joi.string(),
                        facebook: Joi.any(),
                        google: Joi.any(),
                        twitter: Joi.any()
                    }
                }
            }, common.update)
        },
        session: {
            login: {
                payload: {
                    email: Joi.string().required(),
                    password: Joi.string().required()
                }
            }
        },
        'user-groups': {
            create: {
                payload: {
                    name: Joi.string().required(),
                    members: Joi.array().items(Joi.string()),
                    owners: Joi.array().items(Joi.string()),
                    description: Joi.string(),
                    access: Joi.string().only(subdocs.enums.blogs.access)
                }
            },
            findOptions: {
                forPartial: [['email', 'members'], ['groupName', 'name']]
            },
            find: _.merge({
                payload: {
                    email: [Joi.array().items(Joi.string()), Joi.string()],
                    groupName: [Joi.array().items(Joi.string()), Joi.string()]
                }
            }, common.findDefaults),
            findOne: common.findOne,
            update: _.merge({
                payload: {
                    isActive: Joi.boolean(),
                    addedMembers: Joi.array().items(Joi.string()).unique(),
                    removedMembers: Joi.array().items(Joi.string()).unique(),
                    addedOwners: Joi.array().items(Joi.string()).unique(),
                    removedOwners: Joi.array().items(Joi.string()).unique(),
                    description: Joi.string(),
                    access: Joi.string().only(subdocs.enums.blogs.access)
                }
            }, common.update),
            approve: _.merge({
                payload: {
                    addedMembers: Joi.array().items(Joi.string()).unique()
                }
            }, common.update),
            reject: _.merge({
                payload: {
                    addedMembers: Joi.array().items(Joi.string()).unique()
                }
            }, common.update),
            join: common.update,
            leave: common.update,
            delete: _.merge({}, common.update)
        },
        users: {
            signup: {
                payload: {
                    email: Joi.string().required(),
                    organisation: Joi.string().required(),
                    locale: Joi.string().only(['en', 'hi']).default('en'),
                    password: Joi.string().required()
                }
            },
            findOptions: {
                forPartial: [['email', 'email']]
            },
            find: _.merge({
                payload: {
                    email: Joi.string()
                }
            }, common.findDefaults),
            findOne: common.findOne,
            update: _.merge({
                payload: {
                    isActive: Joi.boolean(),
                    roles: Joi.array().items(Joi.string()),
                    password: Joi.string()
                }
            }, common.update),
            forgot: {
                payload: {
                    email: Joi.string().required()
                }
            },
            reset: {
                payload: {
                    key: Joi.string().required(),
                    email: Joi.string().required(),
                    password: Joi.string().required()
                }
            }
        }
    };
};

'use strict';
const {capitalize} = require('lodash');
const {by, org, hasItems} = require('./../common/utils');
const {findValidator, canUpdate, canView, areValidUsers, areValidGroups, isMemberOf, uniqueCheck, prePopulate} = require('./../common/prereqs');
const {buildCreateHandler, buildFindHandler, buildFindOneHandler, buildUpdateHandler} = require('./../common/handlers');
const {sendNotifications, cancelNotifications} = require('./../common/posthandlers');
const schemas = require('./schemas');
const Blogs = require('./model');
module.exports = {
    new: {
        validate: schemas.controller.create,
        pre: [
            canUpdate(Blogs.collection),
            uniqueCheck(Blogs, request => {
                return {
                    title: request.payload.title,
                    organisation: org(request)
                };
            }),
            areValidUsers(['owners', 'contributors', 'subscribers']),
            areValidGroups(['subscriberGroups'])
        ],
        handler: buildCreateHandler(Blogs),
        post: [
            sendNotifications(Blogs, (blog, request) => {
                const title = blog.title;
                const createdBy = by(request);
                return {
                    to: blog.owners,
                    title: ['Blog {{title}} created.', {title}],
                    description: [
                        'Blog {{title}} created and you have been designated owner by {{createdBy}}', {title, createdBy}
                    ]
                };
            })
        ]
    },
    find: {
        validate: findValidator(schemas.controller.find, schemas.controller.findDefaults),
        pre: [
            canView(Blogs.collection)
        ],
        handler: buildFindHandler(Blogs, schemas.controller.findOptions)
    },
    findOne: {
        pre: [
            canView(Blogs.collection),
            prePopulate(Blogs, 'id')
        ],
        handler: buildFindOneHandler(Blogs)
    },
    update: {
        validate: schemas.controller.update,
        pre: [
            canUpdate(Blogs.collection),
            prePopulate(Blogs, 'id'),
            areValidUsers(['addedOwners', 'addedContributors', 'addedSubscribers']),
            areValidGroups(['addedSubscriberGroups']),
            isMemberOf(Blogs, ['owners'])
        ],
        handler: buildUpdateHandler(Blogs, schemas.dao.updateMethod.method),
        post: [
            sendNotifications(Blogs, (blog, request) => {
                let description = {};
                let shouldNotify = false;
                ['owners', 'contributors', 'subscribers', 'subscriberGroups'].forEach(toInspect => {
                    ['added', 'removed'].forEach(t => {
                        const p = t + capitalize(toInspect);
                        if (hasItems(request.payload[p])) {
                            shouldNotify = true;
                            description[toInspect] = description[toInspect] || {};
                            description[toInspect][t] = request.payload[p];
                        }
                    });
                });
                const title = blog.title;
                const updatedBy = by(request);
                return {
                    to: shouldNotify ? blog.owners : [],
                    title: ['Blog {{title}} updated by {{updatedBy}}', {title, updatedBy}],
                    description: description
                };
            })
        ]
    },
    delete: {
        pre: [
            canUpdate(Blogs.collection),
            prePopulate(Blogs, 'id'),
            isMemberOf(Blogs, ['owners'])
        ],
        handler: buildUpdateHandler(Blogs, 'del'),
        post: [
            sendNotifications(Blogs, (blog, request) => {
                const title = blog.title;
                const createdBy = by(request);
                return {
                    to: blog.owners,
                    title: ['Blog {{title}} deleted.', {title}],
                    description: ['Blog {{title}} deleted by {{updatedBy}}', {title, createdBy}]
                };
            })
        ]
    },
    join: {
        pre: [
            canView(Blogs.collection),
            prePopulate(Blogs, 'id')
        ],
        handler: buildUpdateHandler(Blogs, 'join'),
        post: [
            sendNotifications(Blogs, (blog, request) => {
                const title = blog.title;
                const email = by(request);
                const btitle = blog.access === 'public' ? '{{email}} has joined {{title}}' : '{{email}} has joined {{title}} and needs your approval';
                return {
                    to: blog.owners,
                    description: {join: email},
                    title: [btitle, {title, email}],
                    action: blog.access === 'public' ? 'fyi' : 'approve',
                    priority: blog.access === 'restricted' ? 'medium' : 'low'
                };
            })
        ]
    },
    leave: {
        pre: [
            canView(Blogs.collection),
            prePopulate(Blogs, 'id'),
            isMemberOf(Blogs, ['subscribers'])
        ],
        handler: buildUpdateHandler(Blogs, 'leave'),
        post: [
            sendNotifications(Blogs, (blog, request) => {
                const title = blog.title;
                const email = by(request);
                return {
                    to: blog.owners,
                    description: {leave: email},
                    title: ['{{email}} has left {{title}}', {title, email}],
                    action: 'fyi',
                    priority: 'low'
                };
            })
        ]
    },
    approve: {
        validate: schemas.controller.approve,
        pre: [
            canUpdate(Blogs.collection),
            prePopulate(Blogs, 'id'),
            isMemberOf(Blogs, ['owners']),
            areValidUsers(['addedSubscribers'])
        ],
        handler: buildUpdateHandler(Blogs, 'approve'),
        post: [
            sendNotifications(Blogs, (blog, request) => {
                const title = blog.title;
                const hasAddedSubscribers = hasItems(request.payload.addedSubscribers);
                return {
                    to: hasAddedSubscribers ? blog.owners : [],
                    title: ['{{title}} has new approved subscribers', {title}],
                    description: hasAddedSubscribers ? {approved: request.payload.addedSubscribers} : {},
                    priority: 'medium'
                };
            }),
            cancelNotifications(Blogs, 'approve', (blog, request, notification) => {
                let modified = false;
                const updatedBy = by(request);
                request.payload.addedSubscribers.forEach(a => {
                    if (notification.content.join === a) {
                        modified = true;
                        notification.setState('cancelled', updatedBy);
                    }
                });
                return modified ? notification.save() : notification;
            })
        ]
    },
    reject: {
        validate: schemas.controller.approve,
        pre: [
            canUpdate(Blogs.collection),
            prePopulate(Blogs, 'id'),
            isMemberOf(Blogs, ['owners']),
            areValidUsers(['addedSubscribers'])
        ],
        handler: buildUpdateHandler(Blogs, 'reject'),
        post: [
            sendNotifications(Blogs, (blog, request) => {
                const title = blog.title;
                const updatedBy = by(request);
                const hasAddedSubscribers = hasItems(request.payload.addedSubscribers);
                return {
                    to: hasAddedSubscribers ? request.payload.addedSubscribers : [],
                    title: ['Your request to follow {{title}} was denied', {title}],
                    description: ['Your request to follow {{title}} was denied by {{updatedBy}}', {title, updatedBy}]
                };
            }),
            cancelNotifications(Blogs, 'approve', (blog, request, notification) => {
                const updatedBy = by(request);
                request.payload.addedSubscribers.forEach(a => {
                    /*istanbul ignore else*/
                    if (notification.content.join === a) {
                        notification.setState('cancelled', updatedBy);
                    }
                });
                return notification.save();
            })

        ]
    }
};

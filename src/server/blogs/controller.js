'use strict';
const _ = require('./../lodash');
const utils = require('./../common/utils');
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const post = require('./../common/posthandlers');
const {upperFirst} = _;
const {by, org, hasItems} = utils;
const { canUpdate, canView, areValidUsers, areValidGroups, isMemberOf, uniqueCheck, prePopulate, buildMongoQuery} = pre;
const {buildCreateHandler, buildFindHandler, buildFindOneHandler, buildUpdateHandler} = handlers;
const {sendNotifications, cancelNotifications, hashCodeOn, populateObject} = post;
const schema = require('./../../shared/rest-api')(require('joi'), _).blogs;
const Blogs = require('./model');
module.exports = {
    new: {
        validate: schema.create,
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
            }),
            populateObject(Blogs),
            hashCodeOn(Blogs)
        ]
    },
    find: {
        validate: schema.find,
        pre: [
            canView(Blogs.collection),
            buildMongoQuery(Blogs, schema.findOptions)
        ],
        handler: buildFindHandler(Blogs),
        post: [
            populateObject(Blogs),
            hashCodeOn(Blogs)
        ]
    },
    findOne: {
        pre: [
            canView(Blogs.collection),
            prePopulate(Blogs, 'id')
        ],
        handler: buildFindOneHandler(Blogs),
        post: [
            populateObject(Blogs),
            hashCodeOn(Blogs)
        ]
    },
    update: {
        validate: schema.update,
        pre: [
            canUpdate(Blogs.collection),
            prePopulate(Blogs, 'id'),
            areValidUsers(['addedOwners', 'addedContributors', 'addedSubscribers']),
            areValidGroups(['addedSubscriberGroups']),
            isMemberOf(Blogs, ['owners'])
        ],
        handler: buildUpdateHandler(Blogs, 'update'),
        post: [
            sendNotifications(Blogs, (blog, request) => {
                let description = {};
                let shouldNotify = false;
                ['owners', 'contributors', 'subscribers', 'subscriberGroups'].forEach(toInspect => {
                    ['added', 'removed'].forEach(t => {
                        const p = t + upperFirst(toInspect);
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
            }),
            populateObject(Blogs),
            hashCodeOn(Blogs)
        ]
    },
    delete: {
        validate: schema.delete,
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
            }),
            populateObject(Blogs),
            hashCodeOn(Blogs)
        ]
    },
    join: {
        validate: schema.join,
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
            }),
            populateObject(Blogs),
            hashCodeOn(Blogs)
        ]
    },
    leave: {
        validate: schema.leave,
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
            }),
            populateObject(Blogs),
            hashCodeOn(Blogs)
        ]
    },
    approve: {
        validate: schema.approve,
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
            }),
            populateObject(Blogs),
            hashCodeOn(Blogs)
        ]
    },
    reject: {
        validate: schema.reject,
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
            }),
            populateObject(Blogs),
            hashCodeOn(Blogs)
        ]
    }
};

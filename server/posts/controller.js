'use strict';
const moment = require('moment');
const _ = require('lodash');
const utils = require('./../common/utils');
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const post = require('./../common/posthandlers');
const {filter, flatten} = _;
const {lookupParamsOrPayloadOrQuery, org, buildQuery} = utils;
const {canView, canUpdate, prePopulate, isMemberOf, uniqueCheck, findValidator, buildMongoQuery} = pre;
const {buildCreateHandler, buildFindHandler, buildFindOneHandler, buildUpdateHandler} = handlers;
const {sendNotifications, cancelNotifications, hashCodeOn, populateObject} = post;
const UserGroups = require('./../user-groups/model');
const Blogs = require('./../blogs/model');
const schemas = require('./schemas');
const Posts = require('./model');
/*jshint unused:false*/
/*eslint-disable no-unused-vars*/
const sendNotificationsWhen = {
    'published'(post, request) {
        const blog = request.pre.blogs;
        return UserGroups.find({name: {$in: blog.subscriberGroups}, organisation: post.organisation})
            .then(groups => {
                const to = filter(flatten([blog.owners, blog.subscribers, groups.map(group => group.members)]));
                return {
                    to: to,
                    title: ['New Post {{postTitle}} created.', {postTitle: post.title}],
                    description: ['New Post {{postTitle}} in Blog {{blogTitle}} published by {{publishedBy}}',
                        {postTitle: post.title, publishedBy: post.publishedBy, blogTitle: blog.title}]
                };
            });
    },
    'pending review'(post, request) {
        const blog = request.pre.blogs;
        return {
            to: blog.owners,
            title: ['New Post {{postTitle}} needs your approval to be published.', {postTitle: post.title}],
            description: ['New Post {{postTitle}} in Blog {{blogTitle}} published by {{publishedBy}} needs your approval to be published',
                {postTitle: post.title, blogTitle: blog.title, publishedBy: post.publishedBy}],
            action: 'review',
            priority: 'medium'
        };
    },
    'do not publish'(post, request) {
        const blog = request.pre.blogs;
        return {
            to: post.publishedBy,
            title: ['Post {{postTitle}} not approved for publication.', {postTitle: post.title}],
            description: ['Post {{postTitle}} in Blog {{blogTitle}} not allowed by {{reviewedBy}}',
                {postTitle: post.title, reviewedBy: post.reviewedBy, blogTitle: blog.title}]
        };
    },
    'draft'(post, request) {
        return {
            to: []
        };
    },
    'archived'(post, request) {
        return {
            to: []
        };
    }
};
const buildQueryBuilder = function buildQueryBuilder() {
    return (request, findOptions) => {
        if (lookupParamsOrPayloadOrQuery(request, 'blogTitle')) {
            return Blogs.find(buildQuery(request, {forPartial: [['blogTitle', 'title']]}))
                .then(blogs => {
                    request.query.blogId = blogs.map(blog => blog._id);
                    return buildQuery(request, findOptions);
                });
        } else {
            return buildQuery(request, findOptions);
        }
    };
};
/*jshint unused:true*/
/*eslint-enable no-unused-vars*/
module.exports = {
    buildQueryBuilder,
    new: {
        validate: schemas.controller.create,
        pre: [
            canUpdate(Posts.collection),
            uniqueCheck(Posts, request => {
                return {
                    blogId: lookupParamsOrPayloadOrQuery(request, 'blogId'),
                    organisation: org(request),
                    title: request.payload.title,
                    createdOn: {$gte: moment().subtract(300, 'seconds').toDate()}
                };
            }),
            prePopulate(Blogs, 'blogId'),
            isMemberOf(Blogs, ['contributors', 'owners'])
        ],
        handler: buildCreateHandler(Posts),
        post: [
            sendNotifications(Posts, (post, request) => sendNotificationsWhen[post.state](post, request)),
            hashCodeOn(Posts)
        ]
    },
    find: {
        validate: findValidator(schemas.controller.find, schemas.controller.findDefaults),
        pre: [
            canView(Posts.collection),
            buildMongoQuery(Posts, schemas.controller.findOptions, buildQueryBuilder())
        ],
        handler: buildFindHandler(Posts),
        post: [
            populateObject(Posts),
            hashCodeOn(Posts)
        ]
    },
    findOne: {
        pre: [
            canView(Posts.collection),
            prePopulate(Posts, 'id')
        ],
        handler: buildFindOneHandler(Posts),
        post: [
            populateObject(Posts),
            hashCodeOn(Posts)
        ]
    },
    update: {
        validate: schemas.controller.update,
        pre: [
            canUpdate(Posts.collection),
            prePopulate(Posts, 'id'),
            prePopulate(Blogs, 'blogId'),
            isMemberOf(Blogs, ['contributors', 'owners'])
        ],
        handler: buildUpdateHandler(Posts, 'update'),
        post: [
            hashCodeOn(Posts)
        ]
    },
    publish: {
        validate: schemas.controller.publish,
        pre: [
            canUpdate(Posts.collection),
            prePopulate(Posts, 'id'),
            prePopulate(Blogs, 'blogId'),
            isMemberOf(Blogs, ['contributors', 'owners'])
        ],
        handler: buildUpdateHandler(Posts, 'publish'),
        post: [
            sendNotifications(Posts, (post, request) => sendNotificationsWhen[post.state](post, request)),
            cancelNotifications(Posts, 'review'),
            hashCodeOn(Posts)
        ]
    },
    reject: {
        validate: schemas.controller.reject,
        pre: [
            canUpdate(Posts.collection),
            prePopulate(Posts, 'id'),
            prePopulate(Blogs, 'blogId'),
            isMemberOf(Blogs, ['contributors', 'owners'])
        ],
        handler: buildUpdateHandler(Posts, 'reject'),
        post: [
            sendNotifications(Posts, (post, request) => sendNotificationsWhen[post.state](post, request)),
            cancelNotifications(Posts, 'review'),
            hashCodeOn(Posts)
        ]
    },
    delete: {
        pre: [
            canUpdate(Posts.collection),
            prePopulate(Posts, 'id'),
            prePopulate(Blogs, 'blogId'),
            isMemberOf(Blogs, ['owners'])
        ],
        handler: buildUpdateHandler(Posts, 'del'),
        post: [
            hashCodeOn(Posts)
        ]
    }
};

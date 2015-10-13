'use strict';
import Bluebird from 'bluebird';
import moment from 'moment';
import {lookupParamsOrPayloadOrQuery, org, buildQueryForPartialMatch, buildQueryForDateRange, buildQueryForIDMatch} from './../../common/utils';
import {canView, canUpdate, prePopulate, isMemberOf, uniqueCheck, findValidator} from './../../common/prereqs';
import {buildCreateHandler, buildFindHandler, buildFindOneHandler, buildUpdateHandler} from './../../common/handlers';
import {sendNotifications, cancelNotifications} from './../../common/posthandlers';
import UserGroups from './../../user-groups/model';
import Blogs from './../model';
import schemas from './schemas';
import Posts from './model';
/*jshint unused:false*/
/*eslint-disable no-unused-vars*/
const sendNotificationsWhen = {
    'published'(post, request) {
        const blog = request.pre.blogs;
        return UserGroups.find({name: {$in: blog.subscriberGroups}, organisation: post.organisation})
            .then(groups => {
                const to = [blog.owners, blog.subscribers];
                groups.forEach(group => {
                    to.push(group.members);
                });
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
/*jshint unused:true*/
/*eslint-enable no-unused-vars*/
export default {
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
            sendNotifications(Posts, (post, request) => sendNotificationsWhen[post.state](post, request))
        ]
    },
    find: {
        validate: findValidator(schemas.controller.find),
        pre: [
            canView(Posts.collection)
        ],
        handler: buildFindHandler(Posts, request => {
            let query = buildQueryForPartialMatch({}, request, [['title', 'title'], ['tag', 'tags'], ['publishedBy', 'publishedBy'], ['state', 'state']]);
            query = buildQueryForDateRange(query, request, 'publishedOn');
            query = buildQueryForIDMatch(query, request, [['blogId', 'blogId']]);
            if (lookupParamsOrPayloadOrQuery(request, 'blogTitle')) {
                const blogQuery = buildQueryForPartialMatch({}, request, [['blogTitle', 'title']]);
                return Blogs.find(blogQuery)
                    .then(blogs => {
                        request.query.blogId = blogs.map(blog => blog._id);
                        query = buildQueryForIDMatch(query, request, [['blogId, blogId']]);
                        return query;
                    });
            } else {
                return query;
            }
        }, (output, user) => {
            return Bluebird.all(output.data.map(post => post.populate(user)))
                .then(op => {
                    output.data = op;
                    return output;
                });
        })
    },
    findOne: {
        pre: [
            canView(Posts.collection),
            prePopulate(Posts, 'id')
        ],
        handler: buildFindOneHandler(Posts, (post, user) => post.populate(user))
    },
    update: {
        validate: schemas.controller.update,
        pre: [
            canUpdate(Posts.collection),
            prePopulate(Posts, 'id'),
            prePopulate(Blogs, 'blogId'),
            isMemberOf(Blogs, ['contributors', 'owners'])
        ],
        handler: buildUpdateHandler(Posts, 'update')
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
            cancelNotifications(Posts, 'review')
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
            cancelNotifications(Posts, 'review')
        ]
    },
    delete: {
        pre: [
            canUpdate(Posts.collection),
            prePopulate(Posts, 'id'),
            prePopulate(Blogs, 'blogId'),
            isMemberOf(Blogs, ['owners'])
        ],
        handler: buildUpdateHandler(Posts, 'del')
    }
};

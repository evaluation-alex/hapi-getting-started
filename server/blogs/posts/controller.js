'use strict';
var Joi = require('joi');
var _ = require('lodash');
var moment = require('moment');
var Posts = require('./model');
var Blogs = require('./../model');
var UserGroups = require('./../../user-groups/model');
var ControllerFactory = require('./../../common/controller-factory');
var validAndPermitted = require('./../../common/prereqs/valid-permitted');
var prePopulate = require('./../../common/prereqs/pre-populate');
var PostContent = require('./post-content');
var errors = require('./../../common/errors');
var Promise = require('bluebird');

/*jshint unused:false*/
var stateBasedNotificationSend = {
    'published': function onPostPublished (post, request) {
        var blog = request.pre.blogs;
        return UserGroups._find({name: {$in: blog.subscriberGroups}, organisation: post.organisation})
            .then(function (groups) {
                var to = [blog.owners, blog.subscribers];
                _.forEach(groups, function (group) {
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
    'pending review': function onNeedsApproval (post, request) {
        var blog = request.pre.blogs;
        return {
            to: blog.owners,
            title: ['New Post {{postTitle}} needs your approval to be published.', {postTitle: post.title}],
            description: ['New Post {{postTitle}} in Blog {{blogTitle}} published by {{publishedBy}} needs your approval to be published',
                {postTitle: post.title, blogTitle: blog.title, publishedBy: post.publishedBy}],
            action: 'review',
            priority: 'medium'
        };
    },
    'do not publish': function onReject (post, request) {
        var blog = request.pre.blogs;
        return {
            to: post.publishedBy,
            title: ['Post {{postTitle}} not approved for publication.', {postTitle: post.title}],
            description: ['Post {{postTitle}} in Blog {{blogTitle}} not allowed by {{reviewedBy}}',
                {postTitle: post.title, reviewedBy: post.reviewedBy, blogTitle: blog.title}]
        };
    },
    'draft': function onDraft (post, request) {
        return {
            to: []
        };
    },
    'archived': function onArchived (post, request) {
        return {
            to: []
        };
    }
};
/*jshint unused:true*/

var Controller = new ControllerFactory(Posts)
    .enableNotifications()
    .newController({
        payload: {
            blogId: Joi.string(),
            title: Joi.string(),
            state: Joi.string().only(['draft', 'pending review', 'published', 'archived']),
            content: Joi.string(),
            tags: Joi.array().items(Joi.string()).unique(),
            category: Joi.string(),
            attachments: Joi.array().items(Joi.object()).unique(),
            access: Joi.string().only(['public', 'restricted']),
            allowComments: Joi.boolean(),
            needsReview: Joi.boolean()
        }
    }, [
        validAndPermitted(Blogs, 'blogId', ['contributors', 'owners']),
        prePopulate(Blogs, 'blogId')
    ], function uniqueCheckQuery (request) {
        return {
            blogId: request.params.blogId, //TODO: look at query as well, but that doesnt seem to be working right now
            organisation: request.auth.credentials.user.organisation,
            title: request.payload.title,
            createdOn: {$gte: moment().subtract(300, 'seconds').toDate()}
        };
    }, function newPost (request, by) {
        var blog = request.pre.blogs;
        request.payload.access = _.isUndefined(request.payload.access) ?
            blog.access :
            request.payload.access;
        request.payload.allowComments = _.isUndefined(request.payload.allowComments) ?
            blog.allowComments :
            request.payload.allowComments;
        request.payload.needsReview = _.isUndefined(request.payload.needsReview) ?
            blog.needsReview :
            request.payload.needsReview;
        if (request.payload.state === 'published') {
            if (request.payload.needsReview && !(blog._isMemberOf('owners', by) || by === 'root')) {
                request.payload.state = 'pending review';
            }
        }
        return Posts.newObject(request, by)
            .then(function (post) {
                if (post) {
                    PostContent.writeContent(post, request.payload.content);
                    post.content = request.payload.content;
                }
                return post;
            });
    })
    .sendNotifications(function onNewPost (post, request) {
        return stateBasedNotificationSend[post.state](post, request);
    })
    .findController({
        query: {
            title: Joi.string(),
            blogId: Joi.string(),
            tag: Joi.string(),
            publishedBy: Joi.string(),
            publishedOnBefore: Joi.date(),
            publishedOnAfter: Joi.date(),
            isActive: Joi.string(),
            state: Joi.string()
        }
    }, function buildFindQuery (request) {
        var query = {};
        var fields = [['title', 'title'], ['tag', 'tags'], ['publishedBy', 'publishedBy'], ['state', 'state']];
        _.forEach(fields, function (pair) {
            if (request.query[pair[0]]) {
                query[pair[1]] = {$regex: new RegExp('^.*?' + request.query[pair[0]] + '.*$', 'i')};
            }
        });
        if (request.query.blogId || request.params.blogId) {
            var blogId = request.query.blogId ? request.query.blogId : request.params.blogId;
            query.blogId = Blogs.ObjectID(blogId);
        }
        if (request.query.publishedOnBefore) {
            query.publishedOn = {};
            query.publishedOn.$lte = moment(request.query.publishedOnBefore, ['YYYY-MM-DD']).toDate();
        }
        if (request.query.publishedOnAfter) {
            query.publishedOn = query.publishedOn || {};
            query.publishedOn.$gte = moment(request.query.publishedOnAfter, ['YYYY-MM-DD']).toDate();
        }
        return query;
    }, function enrichPosts (output) {
        return PostContent.readContentMultiple(output.data)
            .then(function (contents) {
                for (var i = 0, l = output.data.length; i < l; i++) {
                    output.data[i].content = contents[i].value();
                }
                return output;
            });
    })
    .findOneController(function enrichPost (post) {
        return PostContent.readContent(post)
            .then(function (content) {
                post.content = content;
                return post;
            });
    })
    .updateController({
        payload: {
            blogId: Joi.string(),
            isActive: Joi.boolean(),
            addedTags: Joi.array().items(Joi.string()).unique(),
            removedTags: Joi.array().items(Joi.string()).unique(),
            addedAttachments: Joi.array().items(Joi.string()).unique(),
            removedAttachments: Joi.array().items(Joi.string()).unique(),
            title: Joi.string(),
            content: Joi.string(),
            access: Joi.string().only(['public', 'restricted']),
            allowComments: Joi.boolean()
        }
    }, [
        validAndPermitted(Blogs, 'blogId', ['contributors', 'owners'])
    ],
    'update',
    function update (post, request, by) {
        if (post.state !== 'archived') {
            PostContent.writeContent(post, request.payload.content);
            return post.update(request, by);
        } else {
            return Promise.reject(new errors.ArchivedPostUpdateError());
        }
    })
    .updateController({
        payload: {
            blogId: Joi.string(),
            access: Joi.string().only(['public', 'restricted'])
        }
    }, [
        validAndPermitted(Blogs, 'blogId', ['owners', 'contributors']),
        prePopulate(Blogs, 'blogId')
    ],
    'publish',
    function publish (post, request, by) {
        if (post.state === 'draft' || post.state === 'pending review') {
            var blog = request.pre.blogs;
            if ((_.findWhere(blog.owners, by) || by === 'root') || (!post.needsReview)) {
                request.payload.state = 'published';
                post.reviewedBy = by;
                post.reviewedOn = new Date();
                post.publishedOn = new Date();
            } else {
                request.payload.state = 'pending review';
            }
            post.update(request, by);
        }
        return post;
    })
    .sendNotifications(function onPublish (post, request) {
        return stateBasedNotificationSend[post.state](post, request);
    })
    .cancelNotifications('review')
    .updateController({
        payload: {
            blogId: Joi.string(),
            isActive: Joi.boolean(),
            access: Joi.string().only(['public', 'restricted'])
        }
    }, [
        validAndPermitted(Blogs, 'blogId', ['owners', 'contributors']),
        prePopulate(Blogs, 'blogId')
    ],
    'reject',
    function reject (post, request, by) {
        if (post.state === 'draft' || post.state === 'pending review') {
            request.payload.state = 'do not publish';
            post.reviewedBy = by;
            post.reviewedOn = new Date();
            post.update(request, by);
        }
        return post;
    })
    .sendNotifications(function onReject (post, request) {
        return stateBasedNotificationSend[post.state](post, request);
    })
    .cancelNotifications('review')
    .deleteController([
        validAndPermitted(Blogs, 'blogId', ['owners'])
    ])
    .doneConfiguring();

module.exports = Controller;

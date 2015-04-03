'use strict';
let Joi = require('joi');
let _ = require('lodash');
let moment = require('moment');
let Posts = require('./model');
let Blogs = require('./../model');
let UserGroups = require('./../../user-groups/model');
let ControllerFactory = require('./../../common/controller-factory');
let isMemberOf = require('./../../common/prereqs/is-member-of');
let prePopulate = require('./../../common/prereqs/pre-populate');
let PostContent = require('./post-content');
let errors = require('./../../common/errors');
let utils = require('./../../common/utils');
let Promise = require('bluebird');
let Hoek = require('hoek');
/*jshint unused:false*/
let stateBasedNotificationSend = {
    'published': function onPostPublished (post, request) {
        let blog = request.pre.blogs;
        return UserGroups.find({name: {$in: blog.subscriberGroups}, organisation: post.organisation})
            .then(function (groups) {
                let to = [blog.owners, blog.subscribers];
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
        let blog = request.pre.blogs;
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
        let blog = request.pre.blogs;
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
        prePopulate(Blogs, 'blogId'),
        isMemberOf(Blogs, ['contributors', 'owners'])
    ], function uniqueCheckQuery (request) {
        return {
            blogId: utils.lookupParamsOrPayloadOrQuery(request, 'blogId'),
            organisation: request.auth.credentials.user.organisation,
            title: request.payload.title,
            createdOn: {$gte: moment().subtract(300, 'seconds').toDate()}
        };
    }, function newPost (request, by) {
        let blog = request.pre.blogs;
        request.payload = Hoek.applyToDefaults(request.payload, {
            access: blog.access,
            allowComments: blog.allowComments,
            needsReview: blog.needsReview
        });
        if (request.payload.state === 'published') {
            if (request.payload.needsReview && !(blog.isMemberOf('owners', by) || by === 'root')) {
                request.payload.state = 'pending review';
            }
        }
        return Posts.newObject(request, by)
            .then(function (post) {
                PostContent.writeContent(post, request.payload.content);
                post.content = request.payload.content;
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
        let query = utils.buildQueryFromRequestForDateFields(
            utils.buildQueryFromRequestForFields({},
                request,
                [['title', 'title'], ['tag', 'tags'], ['publishedBy', 'publishedBy'], ['state', 'state']]
            ), request, 'publishedOn');
        var blogId = utils.lookupParamsOrPayloadOrQuery(request, 'blogId');
        if (blogId) {
            query.blogId = Blogs.ObjectID(blogId);
        }
        return query;
    }, function enrichPosts (output) {
        return Promise.all(PostContent.readContentMultiple(output.data)
            .map(function (content, indx) {
                output.data[indx].content = content;
            }))
            .then(function () {
                return output;
            });
    })
    .findOneController([], function enrichPost (post) {
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
        prePopulate(Blogs, 'blogId'),
        isMemberOf(Blogs, ['contributors', 'owners'])
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
        prePopulate(Blogs, 'blogId'),
        isMemberOf(Blogs, ['owners', 'contributors'])
    ],
    'publish',
    function publish (post, request, by) {
        if (['draft', 'pending review'].indexOf(post.state) !== -1) {
            let blog = request.pre.blogs;
            if ((blog.isMemberOf('owners', by) || by === 'root') || (!post.needsReview)) {
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
        prePopulate(Blogs, 'blogId'),
        isMemberOf(Blogs, ['owners', 'contributors'])
    ],
    'reject',
    function reject (post, request, by) {
        if (['draft', 'pending review'].indexOf(post.state) !== -1) {
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
        prePopulate(Blogs, 'blogId'),
        isMemberOf(Blogs, ['owners'])
    ])
    .doneConfiguring();
module.exports = Controller;

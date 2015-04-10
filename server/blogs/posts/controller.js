'use strict';
let Joi = require('joi');
let _ = require('lodash');
let Promise = require('bluebird');
let moment = require('moment');
let Posts = require('./model');
let Blogs = require('./../model');
let UserGroups = require('./../../user-groups/model');
let ControllerFactory = require('./../../common/controller-factory');
let isMemberOf = require('./../../common/prereqs/is-member-of');
let prePopulate = require('./../../common/prereqs/pre-populate');
let utils = require('./../../common/utils');
let Hoek = require('hoek');
/*jshint unused:false*/
let stateBasedNotificationSend = {
    'published': (post, request) => {
        let blog = request.pre.blogs;
        return UserGroups.find({name: {$in: blog.subscriberGroups}, organisation: post.organisation})
            .then((groups) => {
                let to = [blog.owners, blog.subscribers];
                _.forEach(groups, (group) => {
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
    'pending review': (post, request) => {
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
    'do not publish': (post, request) => {
        let blog = request.pre.blogs;
        return {
            to: post.publishedBy,
            title: ['Post {{postTitle}} not approved for publication.', {postTitle: post.title}],
            description: ['Post {{postTitle}} in Blog {{blogTitle}} not allowed by {{reviewedBy}}',
                {postTitle: post.title, reviewedBy: post.reviewedBy, blogTitle: blog.title}]
        };
    },
    'draft': (post, request) => {
        return {
            to: []
        };
    },
    'archived': (post, request) => {
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
    ], (request) => {
        return {
            blogId: utils.lookupParamsOrPayloadOrQuery(request, 'blogId'),
            organisation: request.auth.credentials.user.organisation,
            title: request.payload.title,
            createdOn: {$gte: moment().subtract(300, 'seconds').toDate()}
        };
    }, (request, by) => {
        let blog = request.pre.blogs;
        request.payload = Hoek.applyToDefaults(request.payload, {
            access: blog.access,
            allowComments: blog.allowComments,
            needsReview: blog.needsReview
        });
        if (request.payload.state === 'published') {
            if (request.payload.needsReview && !(blog.isPresentInOwners(by) || by === 'root')) {
                request.payload.state = 'pending review';
            }
        }
        return Posts.newObject(request, by);
    })
    .sendNotifications((post, request) => stateBasedNotificationSend[post.state](post, request))
    .findController({
        query: {
            title: Joi.string(),
            blogId: Joi.string(),
            tag: Joi.string(),
            publishedBy: Joi.string(),
            publishedOnBefore: Joi.date().format('YYYY-MM-DD'),
            publishedOnAfter: Joi.date().format('YYYY-MM-DD'),
            isActive: Joi.string(),
            state: Joi.string()
        }
    }, (request) => {
        let query = utils.buildQueryFromRequestForDateFields(
            utils.buildQueryFromRequestForFields({},
                request,
                [['title', 'title'], ['tag', 'tags'], ['publishedBy', 'publishedBy'], ['state', 'state']]
            ), request, 'publishedOn');
        let blogId = utils.lookupParamsOrPayloadOrQuery(request, 'blogId');
        if (blogId) {
            query.blogId = Blogs.ObjectID(blogId);
        }
        return query;
    }, (output) => {
        return Promise.all(_.map(output.data, (post) => post.populate()))
            .then((op) => {
                output.data = op;
                return output;
            });
    })
    .findOneController([], (post) => post.populate())
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
    'update')
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
    (post, request, by) => {
        if (['draft', 'pending review'].indexOf(post.state) !== -1) {
            let blog = request.pre.blogs;
            if ((blog.isPresentInOwners(by) || by === 'root') || (!post.needsReview)) {
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
    .sendNotifications((post, request) => stateBasedNotificationSend[post.state](post, request))
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
    (post, request, by) => {
        if (['draft', 'pending review'].indexOf(post.state) !== -1) {
            request.payload.state = 'do not publish';
            post.reviewedBy = by;
            post.reviewedOn = new Date();
            post.update(request, by);
        }
        return post;
    })
    .sendNotifications((post, request) => stateBasedNotificationSend[post.state](post, request))
    .cancelNotifications('review')
    .deleteController([
        prePopulate(Blogs, 'blogId'),
        isMemberOf(Blogs, ['owners'])
    ])
    .doneConfiguring();
module.exports = Controller;

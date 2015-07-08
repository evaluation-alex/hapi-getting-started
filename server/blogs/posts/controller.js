'use strict';
let schemas = require('./schemas');
let _ = require('lodash');
let Bluebird = require('bluebird');
let moment = require('moment');
let Posts = require('./model');
let Blogs = require('./../model');
let UserGroups = require('./../../user-groups/model');
let ControllerFactory = require('./../../common/controller-factory');
let isMemberOf = require('./../../common/prereqs/is-member-of');
let prePopulate = require('./../../common/prereqs/pre-populate');
let utils = require('./../../common/utils');
/*jshint unused:false*/
/*eslint-disable no-unused-vars*/
let sendNotificationsWhen = {
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
/*eslint-enable no-unused-vars*/
let Controller = new ControllerFactory(Posts)
    .enableNotifications()
    .newController(schemas.create, [
        prePopulate(Blogs, 'blogId'),
        isMemberOf(Blogs, ['contributors', 'owners'])
    ], (request) => {
        return {
            blogId: utils.lookupParamsOrPayloadOrQuery(request, 'blogId'),
            organisation: utils.org(request),
            title: request.payload.title,
            createdOn: {$gte: moment().subtract(300, 'seconds').toDate()}
        };
    })
    .sendNotifications((post, request) => sendNotificationsWhen[post.state](post, request))
    .findController(schemas.find, (request) => {
        let query = utils.buildQueryForPartialMatch({}, request, [['title', 'title'], ['tag', 'tags'], ['publishedBy', 'publishedBy'], ['state', 'state']]);
        query = utils.buildQueryForDateRange(query, request, 'publishedOn');
        query = utils.buildQueryForIDMatch(query, request, [['blogId', 'blogId']]);
        if (utils.lookupParamsOrPayloadOrQuery(request, 'blogTitle')) {
            let blogQuery = utils.buildQueryForPartialMatch({}, [['blogTitle', 'title']]);
            return Blogs.find(blogQuery)
                .then((blogs) => {
                    request.query.blogId = _.map(blogs, (blog) => blog._id);
                    query = utils.buildQueryForIDMatch(query, request, [['blogId, blogId']]);
                    return query;
                });
        } else {
            return query;
        }
    }, (output, user) => {
        return Bluebird.all(_.map(output.data, (post) => post.populate(user)))
            .then((op) => output.data = op)
            .then(() => output);
    })
    .findOneController([], (post, user) => post.populate(user))
    .updateController(schemas.update, [
        prePopulate(Blogs, 'blogId'),
        isMemberOf(Blogs, ['contributors', 'owners'])
    ],
    'update',
    'update')
    .updateController(schemas.publish, [
        prePopulate(Blogs, 'blogId'),
        isMemberOf(Blogs, ['owners', 'contributors'])
    ],
    'publish',
    'publish')
    .sendNotifications((post, request) => sendNotificationsWhen[post.state](post, request))
    .cancelNotifications('review')
    .updateController(schemas.reject, [
        prePopulate(Blogs, 'blogId'),
        isMemberOf(Blogs, ['owners', 'contributors'])
    ],
    'reject',
    'reject')
    .sendNotifications((post, request) => sendNotificationsWhen[post.state](post, request))
    .cancelNotifications('review')
    .deleteController([
        prePopulate(Blogs, 'blogId'),
        isMemberOf(Blogs, ['owners'])
    ])
    .doneConfiguring();
module.exports = Controller;

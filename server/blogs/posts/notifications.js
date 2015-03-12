'use strict';
var _ = require('lodash');
var Notifications = require('./../../users/notifications/model');
var UserGroups = require('./../../user-groups/model');
var logger = require('./../../../config').logger;

Notifications.on('new posts', function (obj) {
    var post = obj.object;
    if (post.state === 'published') {
        Notifications.emit('post published', obj);
    }
    else if (post.state === 'pending review') {
        Notifications.emit('post needs approval', obj);
    }
});

Notifications.on('publish posts', function (obj) {
    var post = obj.object;
    if (post.state === 'published') {
        Notifications.emit('post published', obj);
    }
    else if (post.state === 'pending review') {
        Notifications.emit('post pending review', obj);
    }
});

Notifications.on('reject posts', function (obj) {
    var post = obj.object;
    if (post.state === 'do not publish') {
        Notifications.emit('post do not publish', obj);
    }
});

Notifications.on('post pending review', function (obj) {
    var request = obj.request;
    var blog = request.pre.blogs;
    var post = obj.object;
    if (post.state === 'pending review') {
        Notifications.create(blog.owners,
            blog.organisation,
            'Posts',
            post._id,
            ['New Post {{postTitle}} needs your approval to be published.', {postTitle: post.title}],
            'unread',
            'approve',
            'medium',
            ['New Post {{postTitle}} in Blog {{blogTitle}} publishedBy {{publishedBy}} needs your approval to be published',
                {postTitle: post.title, blogTitle: blog.title, publishedBy: post.publishedBy}],
            request.auth.credentials.user.email)
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            });
    }
});

Notifications.on('post published', function (obj) {
    var request = obj.request;
    var blog = request.pre.blogs;
    var post = obj.object;
    if (post.state === 'published') {
        UserGroups._find({name: {$in: blog.subscriberGroups}, organisation: post.organisation})
            .then(function (groups) {
                var usersToNotify = [blog.owners, blog.subscribers];
                _.forEach(groups, function (group) {
                    usersToNotify.push(group.members);
                });
                //email, organisation, objectType, objectId, title, state, action, priority, content, by
                return Notifications.create(_.flatten(usersToNotify),
                    blog.organisation,
                    'Posts',
                    post._id,
                    ['New Post {{postTitle}} created.', {postTitle: post.title}],
                    'unread',
                    'fyi',
                    'low',
                    ['New Post {{postTitle}} in Blog {{blogTitle}} publishedBy {{publishedBy}}',
                        {postTitle: post.title, publishedBy: post.publishedBy, blogTitle: blog.title}],
                    request.auth.credentials.user.email);
            })
            .then(function () {
                return Notifications._find({
                    objectType: 'Posts',
                    objectId: post._id,
                    state: 'unread',
                    action: 'approve'
                });
            })
            .then(function (notifications) {
                return _.map(notifications, function (notification) {
                    notification.setState('cancelled', request.auth.credentials.user.email);
                    return notification.save();
                });
            })
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            });

    }
});

Notifications.on('post do not publish', function (obj) {
    var request = obj.request;
    var blog = request.pre.blogs;
    var post = obj.object;
    if (post.state === 'do not publish') {
        Notifications._find({
            objectType: 'Posts',
            objectId: post._id,
            state: 'unread',
            action: 'approve'
        })
            .then(function (notifications) {
                return _.map(notifications, function (notification) {
                    notification.setState('cancelled', request.auth.credentials.user.email);
                    return notification.save();
                });
            })
            .then(function () {
                return Notifications.create(post.publishedBy,
                    blog.organisation,
                    'Posts',
                    post._id,
                    ['Post {{postTitle}} not approved for publication.', {postTitle: post.title}],
                    'unread',
                    'fyi',
                    'medium',
                    ['Post {{postTitle}} in Blog {{blogTitle}} not allowed by {{reviewedBy}}',
                        {postTitle: post.title, reviewedBy: post.reviewedBy, blogTitle: blog.title}],
                    request.auth.credentials.user.email);
            })
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            });

    }
});

module.exports = Notifications;

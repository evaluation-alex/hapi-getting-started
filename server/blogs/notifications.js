'use strict';
var _ = require('lodash');
var Notifications = require('./../users/notifications/model');
var logger = require('./../../config').logger;

Notifications.on('new blogs', function (obj) {
    var blog = obj.object;
    var request = obj.request;
    //email, organisation, objectType, objectId, title, state, action, priority, content, by
    Notifications.create(blog.owners,
        blog.organisation,
        'Blogs',
        blog._id,
        ['Blog {{title}} created.', {title: blog.title}],
        'unread',
        'fyi',
        'low',
        ['Blog {{title}} created and you have been designated owner by {{createdBy}}', {
            title: blog.title,
            createdBy: blog.createdBy
        }],
        request.auth.credentials.user.email)
        .catch(function (err) {
            if (err) {
                logger.error({error: err});
            }
        });
});

Notifications.on('delete blogs', function (obj) {
    var blog = obj.object;
    var request = obj.request;
    //email, organisation, objectType, objectId, title, state, action, priority, content, by
    Notifications.create(blog.owners,
        blog.organisation,
        'Blogs',
        blog._id,
        ['Blog {{title}} deleted.', {title: blog.title}],
        'unread',
        'fyi',
        'low',
        ['Blog {{title}} deleted by {{updatedBy}}', {title: blog.title, updatedBy: blog.updatedBy}],
        request.auth.credentials.user.email)
        .catch(function (err) {
            if (err) {
                logger.error({error: err});
            }
        });
});

Notifications.on('update blogs', function (obj) {
    var blog = obj.object;
    var request = obj.request;
    var description = {};
    var shouldNotify = false;
    _.forEach(['subscribers', 'subscriberGroups', 'contributors', 'owners'], function (toInspect) {
        _.forEach(['added', 'removed'], function (t) {
            var p = t + _.capitalize(toInspect);
            if (request.payload[p] && request.payload[p].length > 0) {
                shouldNotify = true;
                description[toInspect] = description[toInspect] || {};
                description[toInspect][t] = request.payload[p];
            }
        });
    });
    //email, organisation, objectType, objectId, title, state, action, priority, content, by
    if (shouldNotify) {
        Notifications.create(blog.owners,
            blog.organisation,
            'Blogs',
            blog._id,
            ['Blog {{title}} updated by {{updatedBy}}', {title: blog.title, updatedBy: blog.updatedBy}],
            'unread',
            'fyi',
            'low',
            description,
            request.auth.credentials.user.email)
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            });
    }
});

Notifications.on('subscribe blogs', function (obj) {
    var blog = obj.object;
    var request = obj.request;
    if (request.payload.addedSubscribers && request.payload.addedSubscribers.length > 0) {
        var priority = 'low';
        var action = 'fyi';
        var description = {subscribers: {added: request.payload.addedSubscribers}};
        if (blog.access === 'restricted') {
            priority = 'medium';
            action = 'approve';
        }
        //email, organisation, objectType, objectId, title, state, action, priority, content, by
        Notifications.create(blog.owners,
            blog.organisation,
            'Blogs',
            blog._id,
            ['{{title}} has new subscribers that need approval', {title: blog.title}],
            'unread',
            action,
            priority,
            description,
            request.auth.credentials.user.email)
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            });
    }
});

Notifications.on('approve blogs', function (obj) {
    var blog = obj.object;
    var request = obj.request;
    if (request.payload.addedSubscribers && request.payload.addedSubscribers.length > 0) {
        var priority = 'low';
        var action = 'fyi';
        var description = {subscribers: {approved: request.payload.addedSubscribers}};
        //email, organisation, objectType, objectId, title, state, action, priority, content, by
        Notifications.create(blog.owners,
            blog.organisation,
            'Blogs',
            blog._id,
            ['{{title}} has new approved subscribers', {title: blog.title}],
            'unread',
            action,
            priority,
            description,
            request.auth.credentials.user.email);
        Notifications._find({
            objectType: 'Blogs',
            objectId: blog._id,
            state: 'unread',
            action: 'approve'
        })
            .then(function (notifications) {
                return _.map(notifications, function (notification) {
                    _.remove(notification.description.subscribers.added, request.payload.addedSubscribers);
                    if (notification.description.subscribers.added.length === 0) {
                        notification.setState('cancelled', request.auth.credentials.user.email);
                    }
                    return notification.save();
                });
            });
    }
});

Notifications.on('reject blogs', function (obj) {
    var blog = obj.object;
    var request = obj.request;
    if (request.payload.addedSubscribers && request.payload.addedSubscribers.length > 0) {
        Notifications._find({
            objectType: 'Blogs',
            objectId: blog._id,
            state: 'unread',
            action: 'approve'
        })
            .then(function (notifications) {
                return _.map(notifications, function (notification) {
                    _.remove(notification.description.subscribers.added, request.payload.addedSubscribers);
                    if (notification.description.subscribers.added.length === 0) {
                        notification.setState('cancelled', request.auth.credentials.user.email);
                    }
                    return notification.save();
                });
            });
    }
});

module.exports = Notifications;

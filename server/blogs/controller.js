'use strict';
var Joi = require('joi');
var _ = require('lodash');
var Blogs = require('./model');
var Users = require('./../users/model');
var UserGroups = require('./../user-groups/model');
var ControllerFactory = require('./../common/controller-factory');
var areValid = require('./../common/pre-reqs').areValid;
var validAndPermitted = require('./../common/pre-reqs').validAndPermitted;
var Notifications = require('./../users/notifications/model');

Notifications.on('new blogs', function (obj) {
    var blog = obj.object;
    var request = obj.request;
    //email, organisation, objectType, objectId, title, state, action, priority, content, by
    Notifications.create(blog.owners,
        blog.organisation,
        'Blogs',
        blog._id,
        'Created ' + blog.title,
        'pending review',
        'fyi',
        'low',
        blog.title + ' created and you have been designated owner by ' + blog.createdBy,
        request.auth.credentials.user.email);
});

Notifications.on('delete blogs', function (obj) {
    var blog = obj.object;
    var request = obj.request;
    //email, organisation, objectType, objectId, title, state, action, priority, content, by
    Notifications.create(blog.owners,
        blog.organisation,
        'Blogs',
        blog._id,
        'Deleted ' + blog.title,
        'unread',
        'fyi',
        'low',
        blog.title + ' deleted by ' + blog.updatedBy,
        request.auth.credentials.user.email);
});

Notifications.on('subscribe blogs', function (obj) {
    var blog = obj.object;
    var request = obj.request;
    if (request.payload.addedSubscribers && request.payload.addedSubscribers.length > 0) {
        var priority = 'low';
        var action = 'fyi';
        var description = JSON.stringify(request.payload.addedSubscribers) + ' have been added as subscribers to this blog';
        if (blog.access === 'restricted') {
            priority = 'medium';
            action = 'approve';
        }
        //email, organisation, objectType, objectId, title, state, action, priority, content, by
        Notifications.create(blog.owners,
            blog.organisation,
            'Blogs',
            blog._id,
            'Joined ' + blog.title,
            'unread',
            action,
            priority,
            description,
            request.auth.credentials.user.email);
    }
});

var Controller = new ControllerFactory('blogs', Blogs, Notifications)
    .newController({
        payload: {
            title: Joi.string(),
            description: Joi.string(),
            owners: Joi.array().items(Joi.string()).unique(),
            contributors: Joi.array().items(Joi.string()).unique(),
            subscribers: Joi.array().items(Joi.string()).unique(),
            subscriberGroups: Joi.array().items(Joi.string()).unique(),
            needsReview: Joi.boolean().default(false),
            access: Joi.string().only(['public', 'restricted']).default('public'),
            allowComments: Joi.boolean().default(true)
        }
    }, [
        {assign: 'validOwners', method: areValid(Users, 'email', 'owners')},
        {assign: 'validContributors', method: areValid(Users, 'email', 'contributors')},
        {assign: 'validSubscribers', method: areValid(Users, 'email', 'subscribers')},
        {assign: 'validSubscriberGroups', method: areValid(UserGroups, 'name', 'subscriberGroups')}
    ], function (request) {
        return {
            title: request.payload.title,
            organisation: request.auth.credentials.user.organisation
        };
    })
    .findController({
        query: {
            title: Joi.string(),
            owner: Joi.string(),
            contributor: Joi.string(),
            subscriber: Joi.string(),
            subGroup: Joi.string(),
            isActive: Joi.string()
        }
    }, function (request) {
        var query = {};
        var fields = [['title', 'title'], ['owner', 'owners'], ['contributor', 'contributors'], ['subscriber', 'subscribers'], ['subGroup', 'subscriberGroups']];
        _.forEach(fields, function (pair) {
            if (request.query[pair[0]]) {
                query[pair[1]] = {$regex: new RegExp('^.*?' + request.query[pair[0]] + '.*$', 'i')};
            }
        });
        return query;
    })
    .findOneController()
    .updateController({
        payload: {
            isActive: Joi.boolean(),
            addedOwners: Joi.array().items(Joi.string()).unique(),
            removedOwners: Joi.array().items(Joi.string()).unique(),
            addedContributors: Joi.array().items(Joi.string()).unique(),
            removedContributors: Joi.array().items(Joi.string()).unique(),
            addedSubscribers: Joi.array().items(Joi.string()).unique(),
            removedSubscribers: Joi.array().items(Joi.string()).unique(),
            addedSubscriberGroups: Joi.array().items(Joi.string()).unique(),
            removedSubscriberGroups: Joi.array().items(Joi.string()).unique(),
            description: Joi.string(),
            needsReview: Joi.boolean(),
            access: Joi.string().only(['public', 'restricted']),
            allowComments: Joi.boolean()
        }
    }, [
        {assign: 'validOwners', method: areValid(Users, 'email', 'addedOwners')},
        {assign: 'validContributors', method: areValid(Users, 'email', 'addedContributors')},
        {assign: 'validSubscribers', method: areValid(Users, 'email', 'addedSubscribers')},
        {assign: 'validSubscriberGroups', method: areValid(UserGroups, 'name', 'addedSubscriberGroups')},
        {assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'id', ['owners'])}
    ], 'update', 'update')
    .deleteController({assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'id', ['owners'])})
    .joinApproveRejectController(['subscribe', 'approve', 'reject'], 'addedSubscribers', 'owners')
    .doneConfiguring();

module.exports = Controller;

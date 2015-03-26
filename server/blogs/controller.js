'use strict';
var Joi = require('joi');
var _ = require('lodash');
var Blogs = require('./model');
var ControllerFactory = require('./../common/controller-factory');
var areValid = require('./../common/prereqs/are-valid');
var validAndPermitted = require('./../common/prereqs/valid-permitted');
var utils = require('./../common/utils');

var Controller = new ControllerFactory(Blogs)
    .enableNotifications()
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
        areValid.users(['owners', 'contributors', 'subscribers']),
        areValid.groups(['subscriberGroups'])
    ], function uniqueCheckQuery (request) {
        return {
            title: request.payload.title,
            organisation: request.auth.credentials.user.organisation
        };
    })
    .sendNotifications(function newNotificationBuilder (blog, request) {
        return {
            to: blog.owners,
            title: ['Blog {{title}} created.', {title: blog.title}],
            description: ['Blog {{title}} created and you have been designated owner by {{createdBy}}', {
                title: blog.title,
                createdBy: request.auth.credentials.user.email
            }]
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
    }, function buildFindQuery (request) {
        var query = {};
        utils.buildQueryFromRequestForFields(query, request, [['title', 'title'], ['owner', 'owners'], ['contributor', 'contributors'], ['subscriber', 'subscribers'], ['subGroup', 'subscriberGroups']]);
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
        areValid.users(['addedOwners', 'addedContributors', 'addedSubscribers']),
        areValid.groups(['addedSubscriberGroups']),
        validAndPermitted(Blogs, 'id', ['owners'])
    ], 'update', 'update')
    .sendNotifications(function updateNotificationBuilder (blog, request) {
        var description = {};
        var shouldNotify = false;
        _.forEach(['subscribers', 'subscriberGroups', 'contributors', 'owners'], function (toInspect) {
            _.forEach(['added', 'removed'], function (t) {
                var p = t + _.capitalize(toInspect);
                if (utils.hasItems(request.payload[p])) {
                    shouldNotify = true;
                    description[toInspect] = description[toInspect] || {};
                    description[toInspect][t] = request.payload[p];
                }
            });
        });
        return {
            to: shouldNotify ? blog.owners : [],
            title: ['Blog {{title}} updated by {{updatedBy}}', {
                title: blog.title,
                updatedBy: request.auth.credentials.user.email
            }],
            description: description
        };
    })
    .deleteController(validAndPermitted(Blogs, 'id', ['owners']))
    .sendNotifications(function deleteNotificationBuilder (blog, request) {
        return {
            to: blog.owners,
            title: ['Blog {{title}} deleted.', {title: blog.title}],
            description: ['Blog {{title}} deleted by {{updatedBy}}', {
                title: blog.title,
                updatedBy: request.auth.credentials.user.email
            }]
        };
    })
    .joinLeaveController(['subscribers'], 'owners', 'title')
    .approveRejectController('addedSubscribers', 'owners', 'title')
    .doneConfiguring();

module.exports = Controller;

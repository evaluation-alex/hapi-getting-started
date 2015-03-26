'use strict';
var Joi = require('joi');
var Blogs = require('./model');
var ControllerFactory = require('./../common/controller-factory');
var areValid = require('./../common/prereqs/are-valid');
var validAndPermitted = require('./../common/prereqs/valid-permitted');
var NewObjectNotificationsBuilder = require('./../common/notifications/new-builder');
var DeleteObjectNotificationsBuilder = require('./../common/notifications/delete-builder');
var AddRemoveNotificationsBuilder = require('./../common/notifications/add-remove-builder');
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
    .sendNotifications(new NewObjectNotificationsBuilder('Blog', 'owners', 'title'))
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
    .sendNotifications(new AddRemoveNotificationsBuilder('Blog', ['owners', 'contributors', 'subscribers', 'subscriberGroups'], 'owners', 'title'))
    .deleteController(validAndPermitted(Blogs, 'id', ['owners']))
    .sendNotifications(new DeleteObjectNotificationsBuilder('Blog', 'owners', 'title'))
    .joinLeaveController(['subscribers'], 'owners', 'title')
    .approveRejectController('addedSubscribers', 'owners', 'title')
    .doneConfiguring();

module.exports = Controller;

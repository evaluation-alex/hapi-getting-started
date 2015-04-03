'use strict';
let Joi = require('joi');
let Blogs = require('./model');
let ControllerFactory = require('./../common/controller-factory');
let areValid = require('./../common/prereqs/are-valid');
let isMemberOf = require('./../common/prereqs/is-member-of');
let CreateDeleteObjectNotificationsBuilder = require('./../common/notifications/create-delete-builder');
let AddRemoveNotificationsBuilder = require('./../common/notifications/add-remove-builder');
let utils = require('./../common/utils');
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
    .sendNotifications(new CreateDeleteObjectNotificationsBuilder('Blog', 'owners', 'title', 'new'))
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
        return utils.buildQueryFromRequestForFields({}, request, [['title', 'title'], ['owner', 'owners'], ['contributor', 'contributors'], ['subscriber', 'subscribers'], ['subGroup', 'subscriberGroups']]);
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
        isMemberOf(Blogs, ['owners'])
    ], 'update', 'update')
    .sendNotifications(new AddRemoveNotificationsBuilder('Blog', ['owners', 'contributors', 'subscribers', 'subscriberGroups'], 'owners', 'title'))
    .deleteController(isMemberOf(Blogs, ['owners']))
    .sendNotifications(new CreateDeleteObjectNotificationsBuilder('Blog', 'owners', 'title', 'delete'))
    .joinLeaveController(['subscribers'], 'owners', 'title')
    .approveRejectController('addedSubscribers', 'owners', 'title')
    .doneConfiguring();
module.exports = Controller;

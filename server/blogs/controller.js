'use strict';
let schemas = require('./schemas');
let Blogs = require('./model');
let ControllerFactory = require('./../common/controller-factory');
let areValid = require('./../common/prereqs/are-valid');
let isMemberOf = require('./../common/prereqs/is-member-of');
let createDeleteObjectNotificationsBuilder = require('./../common/notifications/create-delete-builder');
let addRemoveNotificationsBuilder = require('./../common/notifications/add-remove-builder');
let utils = require('./../common/utils');
let Controller = new ControllerFactory(Blogs)
    .enableNotifications()
    .newController(schemas.create, [
        areValid.users(['owners', 'contributors', 'subscribers']),
        areValid.groups(['subscriberGroups'])
    ], (request) => {
        return {
            title: request.payload.title,
            organisation: utils.org(request)
        };
    })
    .sendNotifications(createDeleteObjectNotificationsBuilder('Blog', 'owners', 'title', 'new'))
    .findController(schemas.find, (request) => {
        return utils.buildQueryForPartialMatch({}, request,
            [['title', 'title'], ['owner', 'owners'], ['contributor', 'contributors'], ['subscriber', 'subscribers'],
                ['subGroup', 'subscriberGroups']
            ]);
    })
    .findOneController()
    .updateController(schemas.update, [
        areValid.users(['addedOwners', 'addedContributors', 'addedSubscribers']),
        areValid.groups(['addedSubscriberGroups']),
        isMemberOf(Blogs, ['owners'])
    ], 'update', 'update')
    .sendNotifications(addRemoveNotificationsBuilder('Blog', ['owners', 'contributors', 'subscribers', 'subscriberGroups'], 'owners', 'title'))
    .deleteController(isMemberOf(Blogs, ['owners']))
    .sendNotifications(createDeleteObjectNotificationsBuilder('Blog', 'owners', 'title', 'delete'))
    .joinLeaveController(['subscribers'], 'owners', 'title')
    .approveRejectController('addedSubscribers', 'owners', 'title')
    .doneConfiguring();
module.exports = Controller;

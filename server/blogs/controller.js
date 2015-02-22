'use strict';
var Joi = require('joi');
var _ = require('lodash');
var Blogs = require('./model');
var Users = require('./../users/model');
var UserGroups = require('./../user-groups/model');
var ControllerFactory = require('./../common/controller-factory').ControllerFactory;
var areValid = require('./../common/controller-factory').areValid;
var validAndPermitted = require('./../common/controller-factory').validAndPermitted;

var Controller = new ControllerFactory('blogs', Blogs)
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
            addedOwners: Joi.array().includes(Joi.string()).unique(),
            removedOwners: Joi.array().includes(Joi.string()).unique(),
            addedContributors: Joi.array().includes(Joi.string()).unique(),
            removedContributors: Joi.array().includes(Joi.string()).unique(),
            addedSubscribers: Joi.array().includes(Joi.string()).unique(),
            removedSubscribers: Joi.array().includes(Joi.string()).unique(),
            addedSubscriberGroups: Joi.array().includes(Joi.string()).unique(),
            removedSubscriberGroups: Joi.array().includes(Joi.string()).unique(),
            description: Joi.string(),
            needsReview: Joi.boolean(),
            access: Joi.string().valid(['public', 'restricted']),
            allowComments: Joi.boolean()
        }
    }, [
        {assign: 'validOwners', method: areValid(Users, 'email', 'addedOwners')},
        {assign: 'validContributors', method: areValid(Users, 'email', 'addedContributors')},
        {assign: 'validSubscribers', method: areValid(Users, 'email', 'addedSubscribers')},
        {assign: 'validSubscriberGroups', method: areValid(UserGroups, 'name', 'addedSubscriberGroups')},
        {assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'id', ['owners'])}
    ], 'update', 'update')
    .newController({
        payload: {
            title: Joi.string(),
            description: Joi.string(),
            owners: Joi.array().includes(Joi.string()).unique(),
            contributors: Joi.array().includes(Joi.string()).unique(),
            subscribers: Joi.array().includes(Joi.string()).unique(),
            subscriberGroups: Joi.array().includes(Joi.string()).unique(),
            needsReview: Joi.boolean().default(false),
            access: Joi.string().valid(['public', 'restricted']).default('public'),
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
    .deleteController({assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'id', ['owners'])})
    .joinApproveRejectController(['subscribe', 'approve', 'reject'], 'addedSubscribers', 'owners')
    .doneConfiguring();

module.exports.Controller = Controller;

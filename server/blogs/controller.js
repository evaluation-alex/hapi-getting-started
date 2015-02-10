'use strict';
var Joi = require('joi');
var Boom = require('boom');
var BaseModel = require('hapi-mongo-models').BaseModel;
var _ = require('lodash');
var Promise = require('bluebird');
var Blogs = require('./model');
var AuthPlugin = require('./../common/auth');
var BaseController = require('./../common/controller').BaseController;
var Users = require('./../users/model');
var UserGroups = require('./../user-groups/model');
var areValid = require('./../common/controller').areValid;

var Controller = {};

var blogCheck = function (request, reply) {
    var query = {
        title: request.payload.title
    };
    Blogs._findOne(query)
        .then(function (blog) {
            if (blog) {
                reply(Boom.conflict('Blog already exists, modify the existing one.'));
            } else {
                reply(true);
            }
        })
        .catch(function (err) {
            if (err) {
                reply(Boom.badImplementation(err));
            }
        });
};

Controller.find = BaseController.find('blogs', Blogs, {
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
    if (request.query.title) {
        query.title = {$regex: new RegExp('^.*?' + request.query.title + '.*$', 'i')};
    }
    if (request.query.owner) {
        query.owners = {$regex: new RegExp('^.*?' + request.query.owners + '.*$', 'i')};
    }
    if (request.query.contributor) {
        query.contributors = {$regex: new RegExp('^.*?' + request.query.contributor + '.*$', 'i')};
    }
    if (request.query.subscriber) {
        query.subscribers = {$regex: new RegExp('^.*?' + request.query.subscriber + '.*$', 'i')};
    }
    if (request.query.subGroup) {
        query.subscriberGroups = {$regex: new RegExp('^.*?' + request.query.subGroup + '.*$', 'i')};
    }
    if (request.query.isActive) {
        query.isActive = request.query.isActive === '"true"';
    }
    return query;
});

Controller.findOne = BaseController.findOne('blogs', Blogs);

Controller.update = BaseController.update('blogs', Blogs, {
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
        description: Joi.string()
    }
});
Controller.update.pre.push({assign: 'validOwners', method: areValid(Users, 'email', 'addedOwners')},
    {assign: 'validContributors', method: areValid(Users, 'email', 'addedContributors')},
    {assign: 'validSubscribers', method: areValid(Users, 'email', 'addedSubscribers')},
    {assign: 'validSubscriberGroups', method: areValid(UserGroups, 'name', 'addedSubscriberGroups')});

Controller.new = {
    validator: {
        payload: {
            title: Joi.string(),
            description: Joi.string(),
            owners: Joi.array().includes(Joi.string()).unique(),
            contributors: Joi.array().includes(Joi.string()).unique(),
            subscribers: Joi.array().includes(Joi.string()).unique(),
            subscriberGroups: Joi.array().includes(Joi.string()).unique()
        }
    },
    pre: [
        AuthPlugin.preware.ensurePermissions('update', 'blogs'),
        {assign: 'blogCheck', method: blogCheck},
        {assign: 'validOwners', method: areValid(Users, 'email', 'owners')},
        {assign: 'validContributors', method: areValid(Users, 'email', 'contributors')},
        {assign: 'validSubscribers', method: areValid(Users, 'email', 'subscribers')},
        {assign: 'validSubscriberGroups', method: areValid(UserGroups, 'name', 'subscriberGroups')}
    ],
    handler: function (request, reply) {
        var by = request.auth.credentials.user.email;
        Blogs.create(request.payload.title, request.payload.description, request.payload.owners, request.payload.contributors, request.payload.subscriberGroups, by)
            .then(function (blog) {
                if (!blog) {
                    reply(Boom.notFound('Blog could not be created.'));
                } else {
                    reply(blog);
                }
            })
            .catch(function (err) {
                if (err) {
                    reply(Boom.badImplementation(err));
                }
            });
    }
};

Controller.delete = BaseController.delete('blogs', Blogs);

module.exports.Controller = Controller;

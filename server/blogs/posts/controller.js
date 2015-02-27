'use strict';
var Joi = require('joi');
var _ = require('lodash');
var moment = require('moment');
var Promise = require('bluebird');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Posts = require('./model');
var Blogs = require('./../model');
var ControllerFactory = require('./../../common/controller-factory');
var validAndPermitted = require('./../../common/pre-reqs').validAndPermitted;

var Controller = new ControllerFactory('posts', Posts)
    .findController({
        query: {
            title: Joi.string(),
            blogId: Joi.string(),
            tag: Joi.string(),
            publishedBy: Joi.string(),
            publishedOnBefore: Joi.date(),
            publishedOnAfter: Joi.date(),
            isActive: Joi.string(),
            state: Joi.string()
        }
    }, function (request) {
        var query = {};
        var fields = [['title', 'title'], ['tag', 'tags'], ['publishedBy', 'publishedBy'], ['state', 'state']];
        _.forEach(fields, function (pair) {
            if (request.query[pair[0]]) {
                query[pair[1]] = {$regex: new RegExp('^.*?' + request.query[pair[0]] + '.*$', 'i')};
            }
        });
        if (request.query.blogId || request.params.blogId) {
            var blogId = request.query.blogId ? request.query.blogId : request.params.blogId;
            query.blogId = BaseModel.ObjectID(blogId);
        }
        if (request.query.publishedOnBefore) {
            query.publishedOn = {};
            query.publishedOn.$lte = moment(request.query.publishedOnBefore, ['YYYY-MM-DD']).toDate();
        }
        if (request.query.publishedOnAfter) {
            query.publishedOn = query.publishedOn || {};
            query.publishedOn.$gte = moment(request.query.publishedOnAfter, ['YYYY-MM-DD']).toDate();
        }
        return query;
    })
    .findOneController()
    .updateController({
        payload: {
            blogId: Joi.string(),
            isActive: Joi.boolean(),
            addedTags: Joi.array().includes(Joi.string()).unique(),
            removedTags: Joi.array().includes(Joi.string()).unique(),
            addedAttachments: Joi.array().includes(Joi.string()).unique(),
            removedAttachments: Joi.array().includes(Joi.string()).unique(),
            title: Joi.string(),
            content: Joi.string(),
            access: Joi.string().valid(['public', 'restricted']),
            allowComments: Joi.boolean()
        }
    }, [
        {assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'blogId', ['contributors', 'owners'])}
    ], 'update', 'update')
    .newController({
        payload: {
            blogId: Joi.string(),
            title: Joi.string(),
            state: Joi.string().valid(['draft', 'pending review', 'published', 'archived']),
            content: Joi.string(),
            tags: Joi.array().includes(Joi.string()).unique(),
            category: Joi.string(),
            attachments: Joi.array().includes(Joi.object()).unique(),
            access: Joi.string().valid(['public', 'restricted']),
            allowComments: Joi.boolean(),
            needsReview: Joi.boolean()
        }
    }, [
        {assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'blogId', ['contributors', 'owners'])}
    ], function (request) {
        return {
            blogId: request.params.blogId ? request.params.blogId : request.query.blogId,
            organisation: request.auth.credentials.user.organisation,
            title: request.payload.title,
            publishedOn: {$gte: moment().subtract(5, 'seconds').toDate()}
        };
    }, function (request, by) {
        return new Promise(function (resolve, reject) {
            var id = request.params.blogId ? request.params.blogId : request.query.blogId;
            Blogs._findOne({_id: BaseModel.ObjectID(id)})
                .then(function (blog) {
                    if (request.payload.state === 'published') {
                        if (blog.needsReview && !_.findWhere(blog.owners, by)) {
                            request.payload.state = 'pending review';
                        }
                    }
                    request.payload.access = _.isUndefined(request.payload.access) ?
                        blog.access :
                        request.payload.access;
                    request.payload.allowComments = _.isUndefined(request.payload.allowComments) ?
                        blog.allowComments :
                        request.payload.allowComments;
                    request.payload.needsReview = _.isUndefined(request.payload.needsReview) ?
                        blog.needsReview :
                        request.payload.needsReview;
                    resolve(Posts.newObject(request, by));
                })
                .catch(function (err) {
                    reject(err);
                });
        });
    })
    .updateController({
        payload: {
            blogId: Joi.string(),
            access: Joi.string().valid(['public', 'restricted']),
            allowComments: Joi.boolean(),
            needsReview: Joi.boolean()
        }
    },
    [{assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'blogId', ['owners'])}],
    'approve', 'approve')
    .updateController({
        payload: {
            blogId: Joi.string(),
            isActive: Joi.boolean(),
            access: Joi.string().valid(['public', 'restricted']),
            allowComments: Joi.boolean()
        }
    },
    [{assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'blogId', ['owners'])}],
    'reject', 'reject')
    .deleteController({assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'blogId', ['owners'])})
    .doneConfiguring();

module.exports = Controller;

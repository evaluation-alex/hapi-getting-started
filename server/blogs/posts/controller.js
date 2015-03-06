'use strict';
var Joi = require('joi');
var _ = require('lodash');
var moment = require('moment');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Posts = require('./model');
var Blogs = require('./../model');
var ControllerFactory = require('./../../common/controller-factory');
var validAndPermitted = require('./../../common/pre-reqs').validAndPermitted;
var PostContent = require('./post-content');
var utils = require('./../../common/utils');

var prePopulateBlog = function (request, reply) {
    var blogId = request.params.blogId; //TODO: look at query too, but right now that doesnt seem to be working
    Blogs._findOne({_id: BaseModel.ObjectID(blogId)})
        .then(function (blog) {
            reply(blog);
        })
        .catch(function (err) {
            utils.logAndBoom(err, reply);
        });
};

var Controller = new ControllerFactory('posts', Posts)
    .newController({
        payload: {
            blogId: Joi.string(),
            title: Joi.string(),
            state: Joi.string().only(['draft', 'pending review', 'published', 'archived']),
            content: Joi.string(),
            tags: Joi.array().items(Joi.string()).unique(),
            category: Joi.string(),
            attachments: Joi.array().items(Joi.object()).unique(),
            access: Joi.string().only(['public', 'restricted']),
            allowComments: Joi.boolean(),
            needsReview: Joi.boolean()
        }
    }, [
        {assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'blogId', ['contributors', 'owners'])},
        {assign: 'blog', method: prePopulateBlog}
    ], function (request) {
        return {
            blogId: request.params.blogId, //TODO: look at query as well, but that doesnt seem to be working right now
            organisation: request.auth.credentials.user.organisation,
            title: request.payload.title,
            createdOn: {$gte: moment().subtract(300, 'seconds').toDate()}
        };
    }, function (request, by) {
        var blog = request.pre.blog;
        request.payload.access = _.isUndefined(request.payload.access) ?
            blog.access :
            request.payload.access;
        request.payload.allowComments = _.isUndefined(request.payload.allowComments) ?
            blog.allowComments :
            request.payload.allowComments;
        request.payload.needsReview = _.isUndefined(request.payload.needsReview) ?
            blog.needsReview :
            request.payload.needsReview;
        if (request.payload.state === 'published') {
            if (request.payload.needsReview && !(blog._isMemberOf('owners', by) || by === 'root')) {
                request.payload.state = 'pending review';
            }
        }
        return Posts.newObject(request, by)
            .then(function (post) {
                if (post) {
                    PostContent.writeContent(post, request.payload.content);
                }
                return post;
            });
    })
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
    }, function (output) {
        return PostContent.readContentMultiple(output.data)
            .then(function (contents) {
                for (var i = 0, l = output.data.length; i < l; i++) {
                    output.data[i].content = contents[i].value();
                }
                return output;
            });
    })
    .findOneController(function (post) {
        return PostContent.readContent(post)
            .then(function (content) {
                post.content = content;
                return post;
            });
    })
    .updateController({
        payload: {
            blogId: Joi.string(),
            isActive: Joi.boolean(),
            addedTags: Joi.array().items(Joi.string()).unique(),
            removedTags: Joi.array().items(Joi.string()).unique(),
            addedAttachments: Joi.array().items(Joi.string()).unique(),
            removedAttachments: Joi.array().items(Joi.string()).unique(),
            title: Joi.string(),
            content: Joi.string(),
            access: Joi.string().only(['public', 'restricted']),
            allowComments: Joi.boolean()
        }
    }, [
        {assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'blogId', ['contributors', 'owners'])}
    ],
    'update',
    function (post, request, by) {
        PostContent.writeContent(post, request.payload.content);
        return post.update(request, by);
    })
    .updateController({
        payload: {
            blogId: Joi.string(),
            access: Joi.string().only(['public', 'restricted'])
        }
    }, [
        {assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'blogId', ['owners', 'contributors'])},
        {assign: 'blog', method: prePopulateBlog}
    ],
    'publish',
    function (post, request, by) {
        if (post.state === 'draft' || post.state === 'pending review') {
            var blog = request.pre.blog;
            if ((_.findWhere(blog.owners, by) || by === 'root') || (!post.needsReview)) {
                request.payload.state = 'published';
                post.reviewedBy = by;
                post.reviewedOn = new Date();
                post.publishedOn = new Date();
            } else {
                request.payload.state = 'pending review';
            }
            post.update(request, by);
        }
        return post;
    })
    .updateController({
        payload: {
            blogId: Joi.string(),
            isActive: Joi.boolean(),
            access: Joi.string().only(['public', 'restricted'])
        }
    }, [
        {assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'blogId', ['owners', 'contributors'])}
    ],
    'reject',
    function (post, request, by) {
        if (post.state === 'draft' || post.state === 'pending review') {
            request.payload.state = 'do not publish';
            post.reviewedBy = by;
            post.reviewedOn = new Date();
            post.update(request, by);
        }
        return post;
    })
    .deleteController({assign: 'validAndPermitted', method: validAndPermitted(Blogs, 'blogId', ['owners'])})
    .doneConfiguring();

module.exports = Controller;

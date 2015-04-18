'use strict';
let ModelBuilder = require('./../../common/model-builder');
let Blogs = require('./../model');
let UserGroups = require('./../../user-groups/model');
let Joi = require('joi');
let _ = require('lodash');
let utils = require('./../../common/utils');
let errors = require('./../../common/errors');
let Promise = require('bluebird');
var Posts = (new ModelBuilder())
    .onModel(function Posts (attrs) {
        _.assign(this, attrs);
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    })
    .inMongoCollection('posts')
    .usingConnection('app')
    .usingSchema(Joi.object().keys({
        _id: Joi.object(),
        blogId: Joi.object().required(),
        organisation: Joi.string().required(),
        title: Joi.string(),
        state: Joi.string().only(['draft', 'pending review', 'published', 'archived', 'do not publish']).default('draft'),
        access: Joi.string().only(['public', 'restricted']).default('public'),
        allowComments: Joi.boolean().default(true),
        needsReview: Joi.boolean().default(false),
        category: Joi.string(),
        tags: Joi.array().items(Joi.string()).unique(),
        attachments: Joi.array().items(Joi.object()).unique(),
        contentType: Joi.string(),
        content: Joi.object(),
        publishedBy: Joi.string(),
        publishedOn: Joi.date(),
        reviewedBy: Joi.string(),
        reviewedOn: Joi.date(),
        isActive: Joi.boolean().default(true),
        createdBy: Joi.string(),
        createdOn: Joi.date(),
        updatedBy: Joi.string(),
        updatedOn: Joi.date()
    }))
    .addIndex([{organisation: 1, title: 1, blogId: 1, publishedOn: 1}])
    .addIndex([{tags: 1}])
    .addIndex([{state: 1, publishedOn: 1}])
    .decorateWithInsertAndAudit('_id', 'create')
    .decorateWithSoftDeletes()
    .decorateWithUpdates([
        'isActive',
        'state',
        'category',
        'title',
        'access',
        'allowComments',
        'needsReview',
        'content'
    ], [
        'tags',
        'attachments'
    ], 'updatePost')
    .decorateWithSave()
    .decorateWithTrackChanges()
    .doneConfiguring();
Posts.newObject = (doc, by) => {
    let self = this;
    return self.create(utils.lookupParamsOrPayloadOrQuery(doc, 'blogId'),
        doc.auth.credentials.user.organisation,
        doc.payload.title,
        doc.payload.state,
        doc.payload.access,
        doc.payload.allowComments,
        doc.payload.needsReview,
        doc.payload.category,
        doc.payload.tags,
        doc.payload.attachments,
        doc.payload.contentType || 'post',
        doc.payload.content,
        by);
};
Posts.create = (blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, contentType, content, by) => {
    let self = this;
    let now = new Date();
    let document = {
        blogId: blogId,
        organisation: organisation,
        title: title,
        state: state,
        access: access,
        allowComments: allowComments,
        needsReview: needsReview,
        category: category,
        tags: tags,
        attachments: attachments,
        contentType: contentType,
        content: content,
        publishedBy: by,
        publishedOn: state === 'published' ? now : null,
        reviewedBy: state === 'published' ? by : null,
        reviewedOn: state === 'published' ? now : null,
        isActive: true,
        createdBy: by,
        createdOn: now,
        updatedBy: by,
        updatedOn: now
    };
    return self.insertAndAudit(document);
};
Posts.prototype.update = (doc, by) => {
    let self = this;
    if (self.state !== 'archived') {
        return self.updatePost(doc, by);
    } else {
        return Promise.reject(new errors.ArchivedPostUpdateError());
    }
};
Posts.prototype.populate = (user) => {
    let self = this;
    return Promise.resolve({canSee: self.access === 'public'})
        .then((res) => {
            if (!res.canSee) {
                return Blogs.findOne({_id: Blogs.ObjectID(self.blogId)});
            } else {
                return res;
            }
        })
        .then((blog) => {
            if (!blog.canSee) {
                let isBlogPublic = blog.access === 'public';
                let isOwner = blog.isPresentInOwners(user.email);
                let isContributor = blog.isPresentInContributors(user.email);
                let isSubscriber = blog.isPresentInSubscribers(user.email);
                return {canSee: isBlogPublic || isOwner || isContributor || isSubscriber, blog: blog};
            }
            return blog;
        })
        .then((res) => {
            if (!res.canSee) {
                return UserGroups.count({
                    members: user.email,
                    organisation: user.organisation,
                    name: {$in: res.blog.subscriberGroups}
                })
                    .then((count) => {
                        return count > 0;
                    });
            }
            return res.canSee;
        })
        .then((canSee) => {
            if (!canSee) {
                self.content = 'restricted because you are not an owner, contributor or subscriber to this blog and it is not a public post';
            }
            return self;
        });
};
module.exports = Posts;

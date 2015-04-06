'use strict';
let ModelBuilder = require('./../../common/model-builder');
let Joi = require('joi');
let _ = require('lodash');
let utils = require('./../../common/utils');
var Posts = (new ModelBuilder())
    .onModel(function Posts (attrs) {
        _.assign(this, attrs);
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    })
    .inMongoCollection('posts')
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
    .supportInsertAndAudit('_id', 'create')
    .supportSoftDeletes()
    .supportUpdates([
        'isActive',
        'state',
        'category',
        'title',
        'access',
        'allowComments',
        'needsReview'
    ], [
        'tags',
        'attachments'
    ])
    .supportSave()
    .supportTrackChanges()
    .doneConfiguring();
Posts.newObject = (doc, by) => {
    var self = this;
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
        by);
};
Posts.create = (blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by) => {
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
module.exports = Posts;

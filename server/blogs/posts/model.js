'use strict';
let Model = require('./../../common/model');
let Joi = require('joi');
let Insert = require('./../../common/mixins/insert');
let AddRemove = require('./../../common/mixins/add-remove');
let IsActive = require('./../../common/mixins/is-active');
let Update = require('./../../common/mixins/update');
let Properties = require('./../../common/mixins/properties');
let Save = require('./../../common/mixins/save');
let CAudit = require('./../../common/mixins/audit');
let _ = require('lodash');
let utils = require('./../../common/utils');
var Posts = function Posts (attrs) {
    _.assign(this, attrs);
    Object.defineProperty(this, 'audit', {
        writable: true,
        enumerable: false
    });
};
Posts.collection = 'posts';
Posts.schema = Joi.object().keys({
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
});
Posts.indexes = [
    [{organisation: 1, title: 1, blogId: 1, publishedOn: 1}],
    [{tags: 1}],
    [{state: 1, publishedOn: 1}]
];
_.extend(Posts, Model);
_.extend(Posts, new Insert('_id', 'create'));
_.extend(Posts.prototype, new IsActive());
_.extend(Posts.prototype, new AddRemove({
    tags: 'tags',
    attachments: 'attachments'
}));
_.extend(Posts.prototype, new Properties(['title', 'state', 'category', 'access', 'allowComments', 'needsReview', 'isActive']));
_.extend(Posts.prototype, new Update(['isActive', 'state', 'category', 'title', 'access', 'allowComments', 'needsReview'], ['tags', 'attachments']));
_.extend(Posts.prototype, new Save(Posts));
_.extend(Posts.prototype, new CAudit(Posts.collection, '_id'));
Posts.newObject = function newObject (doc, by) {
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
Posts.create = function create (blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by) {
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


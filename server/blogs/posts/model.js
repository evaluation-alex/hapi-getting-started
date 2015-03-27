'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var Promisify = require('./../../common/mixins/promisify');
var Insert = require('./../../common/mixins/insert');
var AddRemove = require('./../../common/mixins/add-remove');
var IsActive = require('./../../common/mixins/is-active');
var Update = require('./../../common/mixins/update');
var Properties = require('./../../common/mixins/properties');
var Save = require('./../../common/mixins/save');
var CAudit = require('./../../common/mixins/audit');
var _ = require('lodash');
var utils = require('./../../common/utils');

var Posts = BaseModel.extend({
    /* jshint -W064 */
    constructor: function post (attrs) {
        ObjectAssign(this, attrs);
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    }
    /* jshint +W064 */
});

Posts._collection = 'posts';

Promisify(Posts, ['find', 'findOne', 'pagedFind', 'findByIdAndUpdate', 'insert']);
_.extend(Posts, new Insert('_id', 'create'));
_.extend(Posts.prototype, new IsActive());
_.extend(Posts.prototype, new AddRemove({
    tags: 'tags',
    attachments: 'attachments'
}));
_.extend(Posts.prototype, new Properties(['title', 'state', 'category', 'access', 'allowComments', 'needsReview', 'isActive']));
_.extend(Posts.prototype, new Update(['isActive', 'state', 'category', 'title', 'access', 'allowComments', 'needsReview'], ['tags', 'attachments']));
_.extend(Posts.prototype, new Save(Posts));
_.extend(Posts.prototype, new CAudit(Posts._collection, '_id'));

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
    [{blogId: 1, organisation: 1, title: 1, publishedOn: 1}],
    [{title: 1}],
    [{tags: 1}],
    [{state: 1, publishedOn: 1}]
];

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
    var self = this;
    var now = new Date();
    var document = {
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
    return self._insertAndAudit(document);
};

module.exports = Posts;


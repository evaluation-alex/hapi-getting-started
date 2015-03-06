'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../../common/extended-model');
var AddRemove = require('./../../common/model-mixins').AddRemove;
var IsActive = require('./../../common/model-mixins').IsActive;
var Update = require('./../../common/model-mixins').Update;
var Properties = require('./../../common/model-mixins').Properties;
var Save = require('./../../common/model-mixins').Save;
var CAudit = require('./../../common/model-mixins').Audit;
var Promise = require('bluebird');
var Audit = require('./../../audit/model');
var _ = require('lodash');

var Posts = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    }
    /* jshint +W064 */
});

_.extend(Posts.prototype, new AddRemove({
    tags: 'tags',
    attachments: 'attachments'
}));
_.extend(Posts.prototype, IsActive);
_.extend(Posts.prototype, new Properties(['title', 'state', 'category', 'access', 'allowComments', 'needsReview', 'isActive']));
_.extend(Posts.prototype, new Update({
    isActive: 'isActive',
    state: 'state',
    category: 'category',
    title: 'title',
    access: 'access',
    allowComments: 'allowComments',
    needsReview: 'needsReview'
}, {
    tags: 'tags',
    attachments: 'attachments'
}));
_.extend(Posts.prototype, new Save(Posts, Audit));
_.extend(Posts.prototype, new CAudit('Posts', '_id'));

Posts._collection = 'posts';

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

Posts.newObject = function (doc, by) {
    var self = this;
    return self.create(doc.params.blogId,
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
/*jshint unused:true*/

Posts.create = function (blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by) {
    var self = this;
    /*jshint unused: false*/
    return new Promise(function (resolve, reject) {
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
        resolve(self._insert(document, false)
            .then(function (post) {
                if (post) {
                    Audit.create('Posts', post._id, 'create', null, post, by, organisation);
                }
                return post;
            }));
    });
    /*jshint unused:true*/
};

module.exports = Posts;


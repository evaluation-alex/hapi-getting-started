'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model');
var BaseModel = require('hapi-mongo-models').BaseModel;
var AddRemove = require('./../common/model-mixins').AddRemove;
var JoinApproveReject = require('./../common/model-mixins').JoinApproveReject;
var Update = require('./../common/model-mixins').Update;
var Properties = require('./../common/model-mixins').Properties;
var IsActive = require('./../common/model-mixins').IsActive;
var Save = require('./../common/model-mixins').Save;
var CAudit = require('./../common/model-mixins').Audit;
var Promise = require('bluebird');
var Audit = require('./../audit/model');
var _ = require('lodash');
var mkdirp = Promise.promisify(require('mkdirp'));
var Config = require('./../../config');

var Blogs = ExtendedModel.extend({
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

_.extend(Blogs.prototype, new AddRemove({
    owner: 'owners',
    contributor: 'contributors',
    subscriber: 'subscribers',
    groups: 'subscriberGroups',
    needsApproval: 'needsApproval'
}));
_.extend(Blogs.prototype, new Properties(['description', 'isActive', 'needsReview', 'access', 'allowComments']));
_.extend(Blogs.prototype, new JoinApproveReject('addedSubscribers', 'subscriber', 'needsApproval'));
_.extend(Blogs.prototype, new Update({
    isActive: 'isActive',
    description: 'description',
    needsReview: 'needsReview',
    access: 'access',
    allowComments: 'allowComments'
}, {
    owner: 'owners',
    contributor: 'contributors',
    subscriber: 'subscribers',
    groups: 'subscriberGroups',
    needsApproval: 'needsApproval'
}));
_.extend(Blogs.prototype, IsActive);
_.extend(Blogs.prototype, new Save(Blogs, Audit));
_.extend(Blogs.prototype, new CAudit('Blogs', 'title'));

Blogs._collection = 'blogs';

Blogs.schema = Joi.object().keys({
    _id: Joi.object(),
    title: Joi.string().required(),
    organisation: Joi.string().required(),
    description: Joi.string(),
    owners: Joi.array().items(Joi.string()).unique(),
    contributors: Joi.array().items(Joi.string()).unique(),
    subscribers: Joi.array().items(Joi.string()).unique(),
    subscriberGroups: Joi.array().items(Joi.string()).unique(),
    needsApproval: Joi.array().items(Joi.string()).unique(),
    needsReview: Joi.boolean().default(false),
    access: Joi.string().only(['public', 'restricted']),
    allowComments: Joi.boolean().default(true),
    isActive: Joi.boolean().default(true),
    createdBy: Joi.string(),
    createdOn: Joi.date(),
    updatedBy: Joi.string(),
    updatedOn: Joi.date()
});

Blogs.indexes = [
    [{title: 1, organisation: 1}, {unique: true}],
    [{description: 1}],
    [{owners: 1}],
    [{contributors: 1}]
];

Blogs.newObject = function (doc, by) {
    var self = this;
    return self.create(doc.payload.title,
        doc.auth.credentials.user.organisation,
        doc.payload.description,
        doc.payload.owners,
        doc.payload.contributors,
        doc.payload.subscribers,
        doc.payload.subscriberGroups,
        doc.payload.needsReview,
        doc.payload.access,
        doc.payload.allowComments,
        by);
};

Blogs.create = function (title, organisation, description, owners, contributors, subscribers, subscriberGroups, needsReview, access, allowComments, by) {
    var self = this;
    var id = BaseModel.ObjectID();
    mkdirp((Config.storage.diskPath + '/' + organisation + '/blogs/' + id.toString()).replace(' ', '-'), {});
    var document = {
        _id: id,
        title: title,
        organisation: organisation,
        description: description,
        owners: owners && owners.length > 0 ? owners : [by],
        contributors: contributors && contributors.length > 0 ? contributors : [by],
        subscribers: subscribers && subscribers.length > 0 ? subscribers : [by],
        subscriberGroups: subscriberGroups ? subscriberGroups : [],
        needsApproval: [],
        needsReview: needsReview,
        access: access,
        allowComments: allowComments,
        isActive: true,
        createdBy: by,
        createdOn: new Date(),
        updatedBy: by,
        updatedOn: new Date()
    };
    return self._insertAndAudit(document, 'title');
};

module.exports = Blogs;


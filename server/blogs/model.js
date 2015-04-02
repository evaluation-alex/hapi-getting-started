'use strict';
var BaseModel = require('./../common/model');
var Joi = require('joi');
var Insert = require('./../common/mixins/insert');
var AddRemove = require('./../common/mixins/add-remove');
var JoinApproveRejectLeave = require('./../common/mixins/join-approve-reject-leave');
var Update = require('./../common/mixins/update');
var Properties = require('./../common/mixins/properties');
var IsActive = require('./../common/mixins/is-active');
var Save = require('./../common/mixins/save');
var CAudit = require('./../common/mixins/audit');
var Promise = require('bluebird');
var _ = require('lodash');
var mkdirp = Promise.promisify(require('mkdirp'));
var Config = require('./../../config');
var utils = require('./../common/utils');
var Blogs = function Blogs (attrs) {
    _.assign(this, attrs);
    Object.defineProperty(this, 'audit', {
        writable: true,
        enumerable: false
    });
};
Blogs.collection = 'blogs';
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
    [{description: 1}]
];
_.extend(Blogs, BaseModel);
_.extend(Blogs, new Insert('title', 'create'));
_.extend(Blogs.prototype, new IsActive());
_.extend(Blogs.prototype, new AddRemove(['owners', 'contributors', 'subscribers', 'subscriberGroups', 'needsApproval']));
_.extend(Blogs.prototype, new Properties(['description', 'isActive', 'needsReview', 'access', 'allowComments']));
_.extend(Blogs.prototype, new JoinApproveRejectLeave('addedSubscribers', 'subscribers', 'needsApproval'));
_.extend(Blogs.prototype, new Update(['isActive', 'description', 'needsReview', 'access', 'allowComments'], ['owners', 'contributors', 'subscribers', 'subscriberGroups', 'needsApproval']));
_.extend(Blogs.prototype, new Save(Blogs));
_.extend(Blogs.prototype, new CAudit(Blogs.collection, 'title'));
Blogs.newObject = function newObject (doc, by) {
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
Blogs.create = function create (title, organisation, description, owners, contributors, subscribers, subscriberGroups, needsReview, access, allowComments, by) {
    var self = this;
    var id = Blogs.ObjectID();
    mkdirp((Config.storage.diskPath + '/' + organisation + '/blogs/' + id.toString()).replace(' ', '-'), {});
    var document = {
        _id: id,
        title: title,
        organisation: organisation,
        description: description,
        owners: utils.hasItems(owners) ? owners : [by],
        contributors: utils.hasItems(contributors) ? contributors : [by],
        subscribers: utils.hasItems(subscribers) ? subscribers : [by],
        subscriberGroups: utils.hasItems(subscriberGroups) ? subscriberGroups : [],
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
    return self.insertAndAudit(document);
};
module.exports = Blogs;


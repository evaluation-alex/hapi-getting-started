'use strict';
let Model = require('./../common/model');
let Joi = require('joi');
let Insert = require('./../common/mixins/insert');
let AddRemove = require('./../common/mixins/add-remove');
let JoinApproveRejectLeave = require('./../common/mixins/join-approve-reject-leave');
let Update = require('./../common/mixins/update');
let Properties = require('./../common/mixins/properties');
let IsActive = require('./../common/mixins/is-active');
let Save = require('./../common/mixins/save');
let CAudit = require('./../common/mixins/audit');
let Promise = require('bluebird');
let _ = require('lodash');
let mkdirp = Promise.promisify(require('mkdirp'));
let Config = require('./../../config');
let utils = require('./../common/utils');
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
_.extend(Blogs, Model);
_.extend(Blogs, new Insert('title', 'create'));
_.extend(Blogs.prototype, new IsActive());
_.extend(Blogs.prototype, new AddRemove(['owners', 'contributors', 'subscribers', 'subscriberGroups', 'needsApproval']));
_.extend(Blogs.prototype, new Properties(['description', 'isActive', 'needsReview', 'access', 'allowComments']));
_.extend(Blogs.prototype, new JoinApproveRejectLeave('addedSubscribers', 'subscribers', 'needsApproval'));
_.extend(Blogs.prototype, new Update(['isActive', 'description', 'needsReview', 'access', 'allowComments'], ['owners', 'contributors', 'subscribers', 'subscriberGroups', 'needsApproval']));
_.extend(Blogs.prototype, new Save(Blogs));
_.extend(Blogs.prototype, new CAudit(Blogs.collection, 'title'));
Blogs.newObject = (doc, by) => {
    let self = this;
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
Blogs.create = (title, organisation, description, owners, contributors, subscribers, subscriberGroups, needsReview, access, allowComments, by) => {
    let self = this;
    let id = Blogs.ObjectID();
    mkdirp((Config.storage.diskPath + '/' + organisation + '/blogs/' + id.toString()).replace(' ', '-'), {});
    let document = {
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

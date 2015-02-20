'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var AddRemove = require('./../common/extended-model').AddRemove;
var IsActive = require('./../common/extended-model').IsActive;
var Properties = require('./../common/extended-model').Properties;
var Save = require('./../common/extended-model').Save;
var CAudit = require('./../common/extended-model').Audit;
var Promise = require('bluebird');
var Audit = require('./../audit/model');
var _ = require('lodash');

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

_.extend(Blogs.prototype, new AddRemove({owner: 'owners', contributor: 'contributors', subscriber: 'subscribers', groups: 'subscriberGroups'}));
_.extend(Blogs.prototype, IsActive);
_.extend(Blogs.prototype, new Properties(['description', 'isActive', 'needsReview', 'access', 'allowComments']));
_.extend(Blogs.prototype, new Save(Blogs, Audit));
_.extend(Blogs.prototype, new CAudit('Blogs', 'title'));

Blogs.prototype.update = function(payload, by) {
    var self = this;
    return self.setIsActive(payload.isActive, by)
        .add(payload.addedOwners, 'owner', by)
        .remove(payload.removedOwners, 'owner', by)
        .add(payload.addedContributors, 'contributor', by)
        .remove(payload.removedContributors, 'contributor', by)
        .add(payload.addedSubscribers, 'subscriber', by)
        .remove(payload.removedSubscribers, 'subscriber', by)
        .add(payload.addedSubscriberGroups, 'groups', by)
        .remove(payload.removedSubscriberGroups, 'groups', by)
        .setDescription(payload.description, by)
        .setNeedsReview(payload.needsReview, by)
        .setAccess(payload.access, by)
        .setAllowComments(payload.allowComments, by);
};

Blogs._collection = 'blogs';

Blogs.schema = Joi.object().keys({
    _id: Joi.object(),
    title: Joi.string().required(),
    organisation: Joi.string(),
    description: Joi.string(),
    owners: Joi.array().includes(Joi.string()).unique(),
    contributors: Joi.array().includes(Joi.string()).unique(),
    subscribers: Joi.array().includes(Joi.string()).unique(),
    subscriberGroups: Joi.array().includes(Joi.string()).unique(),
    needsReview: Joi.boolean().default(false),
    access: Joi.string().valid(['public', 'restricted']),
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

Blogs.newObject = function (doc, by) {
    var self = this;
    return self.create(doc.payload.title, doc.auth.credentials.user.organisation, doc.payload.description, doc.payload.owners, doc.payload.contributors, doc.payload.subscribers, doc.payload.subscriberGroups, doc.payload.needsReview, doc.payload.access, doc.payload.allowComments, by);
};

Blogs.create = function (title, organisation, description, owners, contributors, subscribers, subscriberGroups, needsReview, access, allowComments, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var document = {
            title: title,
            organisation: organisation,
            description: description,
            owners: owners ? owners : [by],
            contributors: contributors ? contributors : [by],
            subscribers: subscribers ? subscribers : [by],
            subscriberGroups: subscriberGroups ? subscriberGroups : [],
            needsReview: needsReview,
            access: access,
            allowComments: allowComments,
            isActive: true,
            createdBy: by,
            createdOn: new Date(),
            updatedBy: by,
            updatedOn: new Date()
        };
        self._insert(document, false)
            .then(function (blog) {
                if (blog) {
                    Audit.create('Blogs', title, 'create', null, blog, by, organisation);
                }
                resolve(blog);
            })
            .catch(function (err) {
                reject(err);
            });
    });
};

module.exports = Blogs;


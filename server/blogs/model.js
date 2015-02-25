'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model');
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
    organisation: Joi.string(),
    description: Joi.string(),
    owners: Joi.array().includes(Joi.string()).unique(),
    contributors: Joi.array().includes(Joi.string()).unique(),
    subscribers: Joi.array().includes(Joi.string()).unique(),
    subscriberGroups: Joi.array().includes(Joi.string()).unique(),
    needsApproval: Joi.array().includes(Joi.string()).unique(),
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
    return new Promise(function (resolve, reject) {
        var document = {
            title: title,
            organisation: organisation,
            description: description,
            owners: owners ? owners : [by],
            contributors: contributors ? contributors : [by],
            subscribers: subscribers ? subscribers : [by],
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


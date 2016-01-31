'use strict';
const utils = require('./../common/utils');
const {org, hasItems} = utils;
const build = require('./../common/dao').build;
const schemas = require('./schemas');
const Blogs = function Blogs(attrs) {
    this.init(attrs);
    return this;
};
Blogs.newObject = function newObject(doc, by) {
    return Blogs.create(doc.payload.title,
        org(doc),
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
Blogs.create = function create(title, organisation, description, owners, contributors, subscribers, subscriberGroups, needsReview, access, allowComments, by) {
    return Blogs.insertAndAudit({
        title,
        organisation,
        description,
        owners: hasItems(owners) ? owners : [by],
        contributors: hasItems(contributors) ? contributors : [by],
        subscribers: hasItems(subscribers) ? subscribers : [by],
        subscriberGroups: hasItems(subscriberGroups) ? subscriberGroups : [],
        needsApproval: [],
        needsReview,
        access,
        allowComments
    }, by);
};
module.exports = build(Blogs, schemas.dao, schemas.model);

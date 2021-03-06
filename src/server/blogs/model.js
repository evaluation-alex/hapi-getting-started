'use strict';
const _ = require('./../lodash');
const Bluebird = require('bluebird');
const {merge} = _;
const utils = require('./../common/utils');
const {hasItems} = utils;
const build = require('./../common/dao').build;
const modelSchema = require('./../../shared/model')(require('joi'), _).blogs;
const UserGroups = require('./../user-groups/model');
const daoOptions = {
    connection: 'app',
    collection: 'blogs',
    idForAudit: undefined,
    indexes: [
        {fields: {title: 1, organisation: 1}, options: {unique: true}},
        {fields: {description: 1}}
    ],
    updateMethod: {
        method: 'update',
        props: [
            'isActive',
            'description',
            'needsReview',
            'access',
            'allowComments',
            'title'
        ],
        arrProps: [
            'owners',
            'contributors',
            'subscribers',
            'subscriberGroups',
            'needsApproval'
        ]
    },
    joinApproveRejectLeave: {
        affectedRole: 'subscribers',
        needsApproval: 'needsApproval'
    },
    saveAudit: true,
    nonEnumerables: ['audit'],
    schemaVersion: 1
};
const Blogs = function Blogs(attrs) {
    this.init(attrs);
    return this;
};
Blogs.newObject = function newObject(doc, by, org) {
    return Blogs.create(doc.payload.title,
        doc.payload.description,
        doc.payload.owners,
        doc.payload.contributors,
        doc.payload.subscribers,
        doc.payload.subscriberGroups,
        doc.payload.needsReview,
        doc.payload.access,
        doc.payload.allowComments,
        by,
        org);
};
Blogs.create = function create(title, description, owners, contributors, subscribers, subscriberGroups, needsReview, access, allowComments, by, organisation) {
    return Blogs.insertAndAudit({
        title,
        description,
        owners: hasItems(owners) ? owners : [by],
        contributors: hasItems(contributors) ? contributors : [by],
        subscribers: hasItems(subscribers) ? subscribers : [by],
        subscriberGroups: hasItems(subscriberGroups) ? subscriberGroups : [],
        needsApproval: [],
        needsReview,
        access,
        allowComments
    }, by, organisation);
};
Blogs.prototype = {
    populate(user) {
        const me = user.email;
        const isOwner = this.owners.indexOf(me) !== -1;
        const isSubscriber = this.subscribers.indexOf(me) !== -1;
        const isContributor = this.contributors.indexOf(me) !== -1;
        merge(this, {
            isOwner,
            isSubscriber,
            isContributor,
            canCreatePosts: isOwner || isContributor,
            canJoin: !isSubscriber,
            canLeave: isSubscriber,
            canEdit: isOwner,
            canDelete: isOwner
        });
        if (!isSubscriber && this.subscriberGroups.length > 0) {
            return UserGroups.count({
                members: user.email,
                name: {$in: this.subscriberGroups}
            }).then(count => count > 0 ? merge(this, {isSubscriber: true}) : this);
        }
        return Bluebird.resolve(this);
    }
};
module.exports = build(Blogs, daoOptions, modelSchema);

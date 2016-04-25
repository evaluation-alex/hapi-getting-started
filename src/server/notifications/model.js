'use strict';
const _ = require('./../lodash');
const {uniq, flatten, isArray, merge} = _;
const Bluebird = require('bluebird');
const build = require('./../common/dao').build;
const modelSchema = require('./../../shared/model')(require('joi'), _).notifications;
const daoOptions = {
    connection: 'app',
    collection: 'notifications',
    indexes: [
        {fields: {objectType: 1, objectId: 1, state: 1, action: 1}},
        {fields: {email: 1, objectType: 1, objectId: 1, createdOn: 1}}
    ],
    updateMethod: {
        method: 'update',
        props: [
            'state',
            'isActive',
            'starred'
        ]
    },
    saveAudit: true,
    i18n: ['title', 'content'],
    nonEnumerables: [],
    schemaVersion: 1
};
const Notifications = function Notifications(attrs) {
    this.init(attrs);
    return this;
};
Notifications.createOne = function createOne(email, objectType, objectId, title, state, action, priority, starred, content, by, organisation) {
    return Notifications.insertAndAudit({
        email,
        objectType,
        objectId,
        title,
        state,
        action,
        priority,
        starred,
        content
    }, by, organisation);
};
Notifications.createMany = function createMany(email, objectType, objectId, title, state, action, priority, starred, content, by, organisation) {
    return Bluebird.all(uniq(flatten(email)).map(e =>
        Notifications.createOne(e, objectType, objectId, title, state, action, priority, starred, content, by, organisation))
    );
};
Notifications.create = function create(email, objectType, objectId, title, state, action, priority, starred, content, by, organisation) {
    if (isArray(email)) {
        return Notifications.createMany(email, objectType, objectId, title, state, action, priority, starred, content, by, organisation);
    } else {
        return Notifications.createOne(email, objectType, objectId, title, state, action, priority, starred, content, by, organisation);
    }
};
Notifications.prototype = {
    populate(user) {
        return Bluebird.resolve(merge(this, {
            canRead: (this.state === 'unread'),
            canUnRead: this.state === 'read',
            canStar: !(this.starred),
            canUnStar: this.starred
        }));
    }
};
module.exports = build(Notifications, daoOptions, modelSchema);

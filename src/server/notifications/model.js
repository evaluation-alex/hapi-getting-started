'use strict';
const _ = require('./../lodash');
const {uniq, flatten, isArray} = _;
const Bluebird = require('bluebird');
const build = require('./../common/dao').build;
const schemas = require('./schemas');
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
module.exports = build(Notifications, schemas.dao, schemas.model);

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
Notifications.createOne = function createOne(email, organisation, objectType, objectId, title, state, action, priority, content, by) {
    let now = new Date();
    return Notifications.upsert({
        email,
        organisation,
        objectType,
        objectId,
        title,
        state,
        action,
        priority,
        content,
        isActive: true,
        createdBy: by,
        createdOn: now,
        updatedBy: by,
        updatedOn: now
    });
};
Notifications.createMany = function createMany(email, organisation, objectType, objectId, title, state, action, priority, content, by) {
    return Bluebird.all(uniq(flatten(email)).map(e =>
        Notifications.createOne(e, organisation, objectType, objectId, title, state, action, priority, content, by))
    );
};
Notifications.create = function create(email, organisation, objectType, objectId, title, state, action, priority, content, by) {
    if (isArray(email)) {
        return Notifications.createMany(email, organisation, objectType, objectId, title, state, action, priority, content, by);
    } else {
        return Notifications.createOne(email, organisation, objectType, objectId, title, state, action, priority, content, by);
    }
};
module.exports = build(Notifications, schemas.dao, schemas.model);

'use strict';
const {unique, flatten, isArray} = require('lodash');
const Bluebird = require('bluebird');
const {build} = require('./../../common/dao');
const schemas = require('./schemas');
class Notifications {
    constructor(attrs) {
        this.init(attrs);
    }
    static createOne (email, organisation, objectType, objectId, title, state, action, priority, content, by) {
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
    }
    static createMany(email, organisation, objectType, objectId, title, state, action, priority, content, by) {
        return Bluebird.all(unique(flatten(email)).map(e =>
                Notifications.createOne(e, organisation, objectType, objectId, title, state, action, priority, content, by))
        );
    }
    static create(email, organisation, objectType, objectId, title, state, action, priority, content, by) {
        if (isArray(email)) {
            return Notifications.createMany(email, organisation, objectType, objectId, title, state, action, priority, content, by);
        } else {
            return Notifications.createOne(email, organisation, objectType, objectId, title, state, action, priority, content, by);
        }
    }
}
build(Notifications, schemas.dao, schemas.model);
module.exports = Notifications;

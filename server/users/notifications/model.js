'use strict';
let ModelBuilder = require('./../../common/model-builder');
let Joi = require('joi');
let _ = require('lodash');
var Promise = require('bluebird');
var Notifications = (new ModelBuilder())
    .onModel(function Notifications (attrs) {
        _.assign(this, attrs);
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    })
    .inMongoCollection('notifications')
    .usingSchema(Joi.object().keys({
        _id: Joi.object(),
        email: Joi.string().email().required(),
        organisation: Joi.string().required(),
        objectType: Joi.string().only(['user-groups', 'posts', 'blogs', 'comments']).required(),
        objectId: Joi.object().required(),
        title: Joi.array().items(Joi.string()),
        state: Joi.string().only(['unread', 'starred', 'read', 'cancelled']).default('unread').required(),
        action: Joi.string(),
        priority: Joi.string().only(['critical', 'medium', 'low']),
        content: Joi.object(),
        isActive: Joi.boolean().default(true),
        createdBy: Joi.string(),
        createdOn: Joi.date(),
        updatedBy: Joi.string(),
        updatedOn: Joi.date()
    }))
    .addIndex([{objectType: 1, objectId: 1, state: 1, action: 1}])
    .addIndex([{email: 1, objectType: 1, objectId: 1, createdOn: 1}])
    .decorateWithSoftDeletes()
    .decorateWithUpdates([
        'state',
        'isActive'
    ], [])
    .decorateWithSave()
    .decorateWithTrackChanges()
    .decorateWithI18N(['title', 'content'])
    .doneConfiguring();
Notifications.create = (email, organisation, objectType, objectId, title, state, action, priority, content, by) => {
    let self = this;
    if (_.isArray(email)) {
        return Promise.all(_.map(_.unique(_.flatten(email)),
                (e) => self.create(e, organisation, objectType, objectId, title, state, action, priority, content, by))
        );
    } else {
        let document = {
            email: email,
            organisation: organisation,
            objectType: objectType,
            objectId: objectId,
            title: title,
            state: state,
            action: action,
            priority: priority,
            content: content,
            isActive: true,
            createdBy: by,
            createdOn: new Date(),
            updatedBy: by,
            updatedOn: new Date()
        };
        return self.insert(document);
    }
};
module.exports = Notifications;

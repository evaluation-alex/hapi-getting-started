'use strict';
let Model = require('./../../common/model');
let Joi = require('joi');
let Properties = require('./../../common/mixins/properties');
let Update = require('./../../common/mixins/update');
let IsActive = require('./../../common/mixins/is-active');
let Save = require('./../../common/mixins/save');
let CAudit = require('./../../common/mixins/audit');
let I18N = require('./../../common/mixins/i18n');
let _ = require('lodash');
var Promise = require('bluebird');
var Notifications = function Notifications (attrs) {
    _.assign(this, attrs);
    Object.defineProperty(this, 'audit', {
        writable: true,
        enumerable: false
    });
};
Notifications.collection = 'notifications';
Notifications.schema = Joi.object().keys({
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
});
Notifications.indexes = [
    [{objectType: 1, objectId: 1, state: 1, action: 1}],
    [{email: 1, objectType: 1, objectId: 1, createdOn: 1}]
];
_.extend(Notifications, Model);
_.extend(Notifications.prototype, new IsActive());
_.extend(Notifications.prototype, new Properties(['state', 'isActive']));
_.extend(Notifications.prototype, new Update(['state', 'isActive'], []));
_.extend(Notifications.prototype, new Save(Notifications));
_.extend(Notifications.prototype, new CAudit(Notifications.collection, '_id'));
_.extend(Notifications.prototype, new I18N(['title', 'content']));
Notifications.create = function create (email, organisation, objectType, objectId, title, state, action, priority, content, by) {
    let self = this;
    if (_.isArray(email)) {
        return Promise.all(_.map(_.unique(_.flatten(email)), function (e) {
            return self.create(e, organisation, objectType, objectId, title, state, action, priority, content, by);
        }));
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

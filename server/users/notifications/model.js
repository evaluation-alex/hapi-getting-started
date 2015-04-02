'use strict';
var BaseModel = require('./../../common/model');
var Joi = require('joi');
var Properties = require('./../../common/mixins/properties');
var Update = require('./../../common/mixins/update');
var IsActive = require('./../../common/mixins/is-active');
var Save = require('./../../common/mixins/save');
var CAudit = require('./../../common/mixins/audit');
var I18N = require('./../../common/mixins/i18n');
var _ = require('lodash');
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
_.extend(Notifications, BaseModel);
_.extend(Notifications.prototype, new IsActive());
_.extend(Notifications.prototype, new Properties(['state', 'isActive']));
_.extend(Notifications.prototype, new Update(['state', 'isActive'], []));
_.extend(Notifications.prototype, new Save(Notifications));
_.extend(Notifications.prototype, new CAudit(Notifications.collection, '_id'));
_.extend(Notifications.prototype, new I18N(['title', 'content']));
Notifications.create = function create (email, organisation, objectType, objectId, title, state, action, priority, content, by) {
    var self = this;
    if (_.isArray(email)) {
        return Promise.all(_.map(_.unique(_.flatten(email)), function (e) {
            return self.create(e, organisation, objectType, objectId, title, state, action, priority, content, by);
        }));
    } else {
        var document = {
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

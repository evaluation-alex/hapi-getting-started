'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../../common/extended-model');
var IsActive = require('./../../common/model-mixins').IsActive;
var Update = require('./../../common/model-mixins').Update;
var Properties = require('./../../common/model-mixins').Properties;
var Save = require('./../../common/model-mixins').Save;
var CAudit = require('./../../common/model-mixins').Audit;
var Audit = require('./../../audit/model');
var _ = require('lodash');
var EventEmitter = require('events');
var Promise = require('bluebird');

var Notifications = ExtendedModel.extend({
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

_.extend(Notifications, EventEmitter.prototype);
_.extend(Notifications.prototype, IsActive);
_.extend(Notifications.prototype, new Properties(['title', 'state', 'category', 'action', 'isActive']));
_.extend(Notifications.prototype, new Update({
    state: 'state',
    isActive: 'isActive'
}, {}));
_.extend(Notifications.prototype, new Save(Notifications, Audit));
_.extend(Notifications.prototype, new CAudit('Notifications', '_id'));

Notifications._collection = 'notifications';

Notifications.schema = Joi.object().keys({
    _id: Joi.object(),
    email: Joi.string().email().required(),
    organisation: Joi.string().required(),
    objectType: Joi.string().only(['UserGroups', 'Posts', 'Blogs', 'Comments']).required(),
    objectId: Joi.object().required(),
    title: Joi.string(),
    state: Joi.string().only(['unread', 'starred', 'read', 'cancelled']).default('unread').required(),
    action: Joi.string(),
    priority: Joi.string().only(['critical', 'medium', 'low']),
    content: Joi.string(),
    isActive: Joi.boolean().default(true),
    createdBy: Joi.string(),
    createdOn: Joi.date(),
    updatedBy: Joi.string(),
    updatedOn: Joi.date()
});

Notifications.indexes = [
    [{email: 1, objectType: 1, objectId: 1, action: 1, createdOn: 1}],
    [{email: 1, objectType: 1, objectId: 1, title: 1}],
];

Notifications.create = function (email, organisation, objectType, objectId, title, state, action, priority, content, by) {
    var self = this;
    if (_.isArray(email)) {
        return Promise.join(_.map(email, function (e) {
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
        return self._insertAndAudit(document);
    }
};

Notifications.cancel = function (userids, objectType, objectId, title, by) {
    return Notifications._find({
        email: {$in: userids},
        objectType: objectType,
        objectId: objectId,
        title: title,
        state: 'unread'
    })
        .then(function (notifications) {
            return Promise.join(_.map(notifications, function (notification) {
                return notification.setState('cancelled', by).save();
            }));
        });
};

module.exports = Notifications;

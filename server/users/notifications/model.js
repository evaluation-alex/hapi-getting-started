'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var Promisify = require('./../../common/mixins/promisify');
var Insert = require('./../../common/mixins/insert');
var Properties = require('./../../common/mixins/properties');
var Update = require('./../../common/mixins/update');
var IsActive = require('./../../common/mixins/is-active');
var Save = require('./../../common/mixins/save');
var CAudit = require('./../../common/mixins/audit');
var I18N = require('./../../common/mixins/i18n');
var _ = require('lodash');
var EventEmitter = require('events');
var Promise = require('bluebird');

var Notifications = BaseModel.extend({
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

Promisify(Notifications, ['find', 'findOne', 'pagedFind', 'findByIdAndUpdate', 'insert']);
_.extend(Notifications, new Insert('_id', 'create'));
_.extend(Notifications, EventEmitter.prototype);
_.extend(Notifications.prototype, new IsActive());
_.extend(Notifications.prototype, new Properties(['title', 'state', 'category', 'action', 'isActive']));
_.extend(Notifications.prototype, new Update({
    state: 'state',
    isActive: 'isActive'
}, {}));
_.extend(Notifications.prototype, new Save(Notifications));
_.extend(Notifications.prototype, new CAudit('Notifications', '_id'));
_.extend(Notifications.prototype, new I18N(['title', 'content']));

Notifications._collection = 'notifications';

Notifications.schema = Joi.object().keys({
    _id: Joi.object(),
    email: Joi.string().email().required(),
    organisation: Joi.string().required(),
    objectType: Joi.string().only(['UserGroups', 'Posts', 'Blogs', 'Comments']).required(),
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

Notifications.create = function create (email, organisation, objectType, objectId, title, state, action, priority, content, by) {
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

module.exports = Notifications;

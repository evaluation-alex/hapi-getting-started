'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var Promisify = require('./../../common/mixins/promisify');
var Insert = require('./../../common/mixins/insert');
var AddRemove = require('./../../common/mixins/add-remove');
var Properties = require('./../../common/mixins/properties');
var Update = require('./../../common/mixins/update');
var IsActive = require('./../../common/mixins/is-active');
var Save = require('./../../common/mixins/save');
var CAudit = require('./../../common/mixins/audit');
var _ = require('lodash');

var Preferences = BaseModel.extend({
    /* jshint -W064 */
    constructor: function preferences (attrs) {
        ObjectAssign(this, attrs);
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    }
    /* jshint +W064 */
});

Preferences._collection = 'preferences';

Promisify(Preferences, ['findOne', 'findByIdAndUpdate', 'insert']);
_.extend(Preferences, new Insert('email', 'create'));
_.extend(Preferences.prototype, new IsActive());
_.extend(Preferences.prototype, new AddRemove([
    'notifications.blogs.blocked',
    'notifications.posts.blocked',
    'notifications.userGroups.blocked'
]));
_.extend(Preferences.prototype, new Properties([
    'notifications.blogs.inapp.frequency',
    'notifications.blogs.inapp.lastSent',
    'notifications.blogs.email.frequency',
    'notifications.blogs.email.lastSent',
    'notifications.posts.inapp.frequency',
    'notifications.posts.inapp.lastSent',
    'notifications.blogs.email.frequency',
    'notifications.blogs.email.lastSent',
    'notifications.userGroups.inapp.frequency',
    'notifications.userGroups.inapp.lastSent',
    'notifications.userGroups.email.frequency',
    'notifications.userGroups.email.lastSent',
    'locale',
    'isActive']));
_.extend(Preferences.prototype, new Update([
    'notifications.blogs.inapp.frequency',
    'notifications.blogs.inapp.lastSent',
    'notifications.blogs.email.frequency',
    'notifications.blogs.email.lastSent',
    'notifications.posts.inapp.frequency',
    'notifications.posts.inapp.lastSent',
    'notifications.blogs.email.frequency',
    'notifications.blogs.email.lastSent',
    'notifications.userGroups.inapp.frequency',
    'notifications.userGroups.inapp.lastSent',
    'notifications.userGroups.email.frequency',
    'notifications.userGroups.email.lastSent',
    'locale',
    'isActive'
], [
    'notifications.blogs.blocked',
    'notifications.posts.blocked',
    'notifications.userGroups.blocked'
]));
_.extend(Preferences.prototype, new Save(Preferences));
_.extend(Preferences.prototype, new CAudit(Preferences._collection, 'email'));

var channelSchema = Joi.object().keys({
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly'),
    lastSent: Joi.date()
});

var notificationPrefSchema = Joi.object().keys({
    inapp: channelSchema,
    email: channelSchema,
    blocked: Joi.array().items(Joi.object())
});

Preferences.schema = Joi.object().keys({
    _id: Joi.object(),
    email: Joi.string().email().required(),
    organisation: Joi.string().required(),
    notifications: Joi.object().keys({
        blogs: notificationPrefSchema,
        posts: notificationPrefSchema,
        userGroups: notificationPrefSchema
    }),
    locale: Joi.string().only('en', 'hi'),
    isActive: Joi.boolean().default(true),
    createdBy: Joi.string(),
    createdOn: Joi.date(),
    updatedBy: Joi.string(),
    updatedOn: Joi.date()
});

Preferences.indexes = [
    [{email: 1, orgranisazation: 1}, {unique: true}]
];

Preferences.create = function create (email, organisation, locale, by) {
    var self = this;
    var document = {
        email: email,
        organisation: organisation,
        notifications: {
            blogs: {
                inapp: {
                    frequency: 'immediate',
                    lastSent: undefined
                },
                email: {
                    frequency: 'daily',
                    lastSent: undefined
                },
                blocked: []
            },
            posts: {
                inapp: {
                    frequency: 'immediate',
                    lastSent: undefined
                },
                email: {
                    frequency: 'daily',
                    lastSent: undefined
                },
                blocked: []
            },
            userGroups: {
                inapp: {
                    frequency: 'immediate',
                    lastSent: undefined
                },
                email: {
                    frequency: 'daily',
                    lastSent: undefined
                },
                blocked: []
            }
        },
        locale: locale,
        isActive: true,
        createdBy: by,
        createdOn: new Date(),
        updatedBy: by,
        updatedOn: new Date()
    };
    return self._insertAndAudit(document);
};

module.exports = Preferences;

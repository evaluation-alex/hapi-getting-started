'use strict';
var Joi = require('joi');
var Preferences = require('./model');
var ControllerFactory = require('./../../common/controller-factory');
var onlyOwnerAllowed = require('./../../common/prereqs/only-owner');

var channelSchema = Joi.object().keys({
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly')
});

var notificationUpdatePrefSchema = Joi.object().keys({
    inapp: channelSchema,
    email: channelSchema,
    addBlocked: Joi.array().items(Joi.object()),
    removeBlocked: Joi.array().items(Joi.object())
});

var Controller = new ControllerFactory(Preferences)
    .findOneController()
    .updateController({
        payload: {
            notifications: Joi.object().keys({
                blogs: notificationUpdatePrefSchema,
                posts: notificationUpdatePrefSchema,
                userGroups: notificationUpdatePrefSchema
            }),
            locale: Joi.string().only('en', 'hi')
        }
    }, [
        onlyOwnerAllowed(Preferences, 'email')
    ], 'update',
    'update')
    .doneConfiguring();

module.exports = Controller;

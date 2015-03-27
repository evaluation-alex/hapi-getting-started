'use strict';
var Joi = require('joi');
var Users = require('./../model');
var ControllerFactory = require('./../../common/controller-factory');
var onlyOwnerAllowed = require('./../../common/prereqs/only-owner');

var channelSchema = Joi.object().keys({
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly')
});

var notificationUpdatePrefSchema = Joi.object().keys({
    inapp: channelSchema,
    email: channelSchema,
    addedBlocked: Joi.array().items(Joi.object()),
    removedBlocked: Joi.array().items(Joi.object())
});

var Controller = new ControllerFactory(Users)
    .updateController({
        payload: {
            preferences: {
                notifications: Joi.object().keys({
                    blogs: notificationUpdatePrefSchema,
                    posts: notificationUpdatePrefSchema,
                    userGroups: notificationUpdatePrefSchema
                }),
                locale: Joi.string().only('en', 'hi')
            }
        }
    }, [
        onlyOwnerAllowed(Users, 'email')
    ], 'update',
    'update')
    .doneConfiguring();

module.exports = Controller;

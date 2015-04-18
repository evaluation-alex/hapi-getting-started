'use strict';
let Joi = require('joi');
let Users = require('./../model');
let ControllerFactory = require('./../../common/controller-factory');
let onlyOwnerAllowed = require('./../../common/prereqs/only-owner');
let channelSchema = Joi.object().keys({
    frequency: Joi.string().only('none', 'immediate', 'daily', 'weekly')
});
let notificationUpdatePrefSchema = Joi.object().keys({
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
    'updatePreferences')
    .doneConfiguring();
module.exports = Controller;

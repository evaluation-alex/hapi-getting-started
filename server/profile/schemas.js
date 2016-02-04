'use strict';
const Joi = require('joi');
const shared = require('./../../shared/profile/validation');
module.exports = {
    dao: {
        isVirtualModel: true,
        updateMethod: {
            method: 'updateProfile',
            props: [
                'profile.firstName',
                'profile.lastName',
                'profile.preferredName',
                'profile.facebook',
                'profile.google',
                'profile.twitter'
            ]
        },
        schemaVersion: 1
    },
    model: {
        firstName: Joi.string(),
        lastName: Joi.string(),
        preferredName: Joi.string(),
        facebook: Joi.any(),
        google: Joi.any(),
        twitter: Joi.any()
    },
    controller: {
        update: shared.controller.update
    }
};

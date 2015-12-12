'use strict';
const Joi = require('joi');
const shared = require('./../../../shared/users/profile/validation');
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
        }
    },
    model: {
        firstName: Joi.string(),
        lastName: Joi.string(),
        preferredName: Joi.string(),
        facebook: Joi.object(),
        google: Joi.object(),
        twitter: Joi.object()
    },
    controller: {
        update: shared.controller.update
    }
};

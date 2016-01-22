'use strict';
const Joi = require('joi');
const shared = require('./../../shared/session/validation');
module.exports = {
    dao: {
        isVirtualModel: true,
        schemaVersion: 1
    },
    model: Joi.array().items({
        ipaddress: Joi.string(),
        key: Joi.object(),
        expires: Joi.date()
    }),
    controller: {
        login: shared.controller.login
    }
};

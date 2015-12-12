'use strict';
const Joi = require('joi');
const shared = require('./../../../shared/users/session/validation');
module.exports = {
    dao: {
        isVirtualModel: true
    },
    model: Joi.array().items(Joi.object().keys({
        ipaddress: Joi.string(),
        key: Joi.object(),
        expires: Joi.date()
    })),
    controller: {
        login: shared.controller.login
    }
};

'use strict';
let Joi = require('joi');
let AuthAttempts = require('./model');
let ControllerFactory = require('./../../../common/controller-factory');
let utils = require('./../../../common/utils');
var Controller = new ControllerFactory(AuthAttempts)
    .findController({
        query: {
            ip: Joi.string(),
            email: Joi.string()
        }
    }, (request) => {
        let query = utils.buildQueryFromRequestForFields({}, request, [['ip', 'ip'], ['email', 'email']]);
        query.organisation = '*';
        return query;
    })
    .doneConfiguring();
module.exports = Controller;

'use strict';
var Joi = require('joi');
var Config = require('./../../config');
var ControllerFactory = require('./../common/controller-factory');
var mailer = require('./../common/plugins/mailer');
var utils = require('./../common/utils');

var Controller = new ControllerFactory()
    .forMethod('contact')
    .withValidation({
        payload: {
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            message: Joi.string().required()
        }
    })
    .handleUsing(function contactHandler(request, reply) {
        var options = {
            subject: Config.projectName + ' contact form',
            to: Config.system.toAddress,
            replyTo: {
                name: request.payload.name,
                address: request.payload.email
            }
        };
        mailer.sendEmail(options, __dirname + '/contact.hbs.md', request.payload)
            .then(function () {
                reply({message: 'Success.'});
            })
            .catch(function (err) {
                utils.logAndBoom(err, utils.locale(request), reply);
            });
    })
    .doneConfiguring();

module.exports = Controller;
'use strict';
var Joi = require('joi');
var Config = require('./../../config');
var Boom = require('boom');
var ControllerFactory = require('./../common/controller-factory');
var mailer = require('./../common/mailer');

var Controller = new ControllerFactory('contact', null)
    .forMethod('contact')
    .withValidation({
        payload: {
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            message: Joi.string().required()
        }
    })
    .handleUsing(function (request, reply) {
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
                reply(Boom.badImplementation(err));
            })
            .done();
    })
    .doneConfiguring();

module.exports = Controller;
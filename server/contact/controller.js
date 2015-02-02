'use strict';
var Joi = require('joi');
var Config = require('./../../config').config({argv: []});
var Boom = require('boom');
var mailer = require('./../common/mailer');

var Controller = {
};

Controller.contact = {
    validator: {
        payload: {
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            message: Joi.string().required()
        }
    },
    handler: function (request, reply) {
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
                if (err) {
                    reply(Boom.badImplementation(err));
                }
            })
            .done();
    }
};

module.exports.Controller = Controller;
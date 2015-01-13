'use strict';
var Joi = require('joi');
var Hoek = require('hoek');
var Config = require('./../../config').config({argv:[]});
var Boom = require('boom');

exports.register = function (server, options, next) {
    options = Hoek.applyToDefaults({basePath: ''}, options);
    server.route({
        method: 'POST',
        path: options.basePath + '/contact',
        config: {
            validate: {
                payload: {
                    name: Joi.string().required(),
                    email: Joi.string().email().required(),
                    message: Joi.string().required()
                }
            }
        },
        handler: function (request, reply) {
            var mailer = request.server.plugins.mailer;
            var options = {
                subject: Config.projectName + ' contact form',
                to: Config.system.toAddress,
                replyTo: {
                    name: request.payload.name,
                    address: request.payload.email
                }
            };
            mailer.sendEmail(options, 'contact', request.payload)
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
    });
    next();
};

exports.register.attributes = {
    name: 'contact'
};

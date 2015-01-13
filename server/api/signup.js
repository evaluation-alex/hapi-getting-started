'use strict';
var Joi = require('joi');
var Hoek = require('hoek');
var Config = require('./../../config').config({argv: []});
var Boom = require('boom');
var Promise = require('bluebird');

exports.register = function (server, options, next) {
    options = Hoek.applyToDefaults({basePath: ''}, options);
    server.route({
        method: 'POST',
        path: options.basePath + '/signup',
        config: {
            validate: {
                payload: {
                    email: Joi.string().email().required(),
                    password: Joi.string().required()
                }
            },
            pre: [{
                assign: 'emailCheck',
                method: function (request, reply) {
                    var Users = request.server.plugins['hapi-mongo-models'].Users;
                    Users._findOne({email: request.payload.email.toLowerCase()})
                        .then(function (user) {
                            if (user) {
                                reply(Boom.conflict('Email already in use.'));
                            } else {
                                reply(true);
                            }
                        })
                        .catch(function (err) {
                            if (err) {
                                reply(Boom.badImplementation(err));
                            }
                        })
                        .done();
                }
            }]
        },
        handler: function (request, reply) {
            var Users = request.server.plugins['hapi-mongo-models'].Users;
            var email = request.payload.email;
            var password = request.payload.password;
            var mailer = request.server.plugins.mailer;
            Users.create(email, password)
                .then(function (user) {
                    if (!user) {
                        reply(Boom.badImplementation('User could not be created'));
                    } else {
                        var signupP = user.signup(user.email);
                        var loginP = user.loginSuccess(request.info.remoteAddress, user.email);
                        var options = {
                            subject: 'Your ' + Config.projectName + ' account',
                            to: {
                                name: request.payload.name,
                                address: email
                            }
                        };
                        var mailerP = mailer.sendEmail(options, 'welcome', request.payload);
                        Promise.join(signupP, loginP, mailerP, function (s, l, m) {
                            var credentials = user.email + ':' + user.session.key;
                            var authHeader = 'Basic ' + new Buffer(credentials).toString('base64');
                            reply({
                                user: user,
                                session: user.session,
                                authHeader: authHeader
                            });
                        }).catch(function (err) {
                            if (err) {
                                reply(Boom.badImplementation(err));
                            }
                        });
                    }
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
    name: 'signup'
};

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
        path: options.basePath + '/login',
        config: {
            validate: {
                payload: {
                    email: Joi.string().required(),
                    password: Joi.string().required()
                }
            },
            pre: [{
                assign: 'abuseDetected',
                method: function (request, reply) {
                    var AuthAttempts = request.server.plugins['hapi-mongo-models'].AuthAttempts;
                    var ip = request.info.remoteAddress;
                    var email = request.payload.email;
                    var replied = false;
                    AuthAttempts.abuseDetected(ip, email)
                        .then(function (detected) {
                            if (detected) {
                                replied = true;
                                reply(Boom.tooManyRequests('Maximum number of auth attempts reached. Please try again later.'));
                            }
                        })
                        .catch(function (err) {
                            if (err && !replied) {
                                replied = true;
                                reply(Boom.badImplementation(err));
                            }
                        })
                        .done(function () {
                            if (!replied) {
                                reply();
                            }
                        });
                }
            }, {
                assign: 'user',
                method: function (request, reply) {
                    var Users = request.server.plugins['hapi-mongo-models'].Users;
                    var email = request.payload.email;
                    var password = request.payload.password;
                    Users.findByCredentials(email, password)
                        .then(function (user) {
                            if (!user) {
                                reply(Boom.notFound('user ' + email + ' not found'));
                            } else {
                                if (user.fail === true) {
                                    user.user.loginFail(request.info.remoteAddress, request.info.remoteAddress).done();
                                    reply(Boom.unauthorized('Invalid password'));
                                } else {
                                    reply(user);
                                }
                            }
                        })
                        .catch(function (err) {
                            if (err) {
                                reply(Boom.badImplementation(err));
                            }
                        })
                        .done();
                }
            }, {
                assign: 'logAttempt',
                method: function (request, reply) {
                    if (request.pre.user) {
                        return reply();
                    }
                    var AuthAttempts = request.server.plugins['hapi-mongo-models'].AuthAttempts;
                    var ip = request.info.remoteAddress;
                    var email = request.payload.email;
                    AuthAttempts.create(ip, email)
                        .then(function (authAttempt) {
                            reply(Boom.unauthorized('Username and password combination not found or account is inactive.'));
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
            var user = request.pre.user;
            user.loginSuccess(request.info.remoteAddress, user.email).done();
            var credentials = user.email + ':' + user.session.key;
            var authHeader = 'Basic ' + new Buffer(credentials).toString('base64');
            reply({
                user: user,
                session: user.session,
                authHeader: authHeader
            });
        }
    });

    server.route({
        method: 'POST',
        path: options.basePath + '/login/forgot',
        config: {
            validate: {
                payload: {
                    email: Joi.string().email().required()
                }
            },
            pre: [{
                assign: 'user',
                method: function (request, reply) {
                    var Users = request.server.plugins['hapi-mongo-models'].Users;
                    Users._findOne({email: request.payload.email.toLowerCase()})
                        .then(function (user) {
                            if (!user) {
                                reply({message: 'Success.'}).takeover();
                            } else {
                                reply(user);
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
            var mailer = request.server.plugins.mailer;
            var user = request.pre.user;
            Users._findOne({_id:user._id})
                .then(function (foundUser) {
                    var options = {
                        subject: 'Reset your ' + Config.projectName + ' password',
                        to: request.payload.email
                    };
                    var p1 = foundUser.resetPasswordSent(request.pre.user.email);
                    var p2 = mailer.sendEmail(options, 'forgot-password', {key: foundUser.resetPwd.token});
                    Promise.join(p1, p2).then(function (v1, v2) {
                        reply({message: 'Success.'});
                    });
                })
                .catch(function (err) {
                    if (err) {
                        reply(Boom.badImplementation(err));
                    }
                })
                .done();
        }
    });

    server.route({
        method: 'POST',
        path: options.basePath + '/login/reset',
        config: {
            validate: {
                payload: {
                    key: Joi.string().required(),
                    email: Joi.string().email().required(),
                    password: Joi.string().required()
                }
            },
            pre: [{
                assign: 'user',
                method: function (request, reply) {
                    var Users = request.server.plugins['hapi-mongo-models'].Users;
                    var conditions = {
                        email: request.payload.email.toLowerCase(),
                        'resetPwd.expires': {$gt: Date.now()}
                    };
                    Users._findOne(conditions)
                        .then(function (user) {
                            if (!user) {
                                reply(Boom.badRequest('Invalid email or key.'));
                            } else {
                                reply(user);
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
            var key = request.payload.key;
            var token = request.pre.user.resetPwd.token;
            if (key !== token) {
                reply(Boom.badRequest('Invalid email or key.'));
            } else {
                var user = request.pre.user;
                user.resetPassword(request.payload.password, request.pre.user.email).done();
                reply({message: 'Success.'});
            }
        }
    });

    next();
};

exports.register.attributes = {
    name: 'login'
};

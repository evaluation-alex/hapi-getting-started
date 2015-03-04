'use strict';
var Joi = require('joi');
var _ = require('lodash');
var Boom = require('boom');
var Config = require('./../../config');
var Users = require('./model');
var Mailer = require('./../common/mailer');
var ControllerFactory = require('./../common/controller-factory');

var emailCheck = function (request, reply) {
    Users._findOne({email: request.payload.email, organisation: request.payload.organisation})
        .then(function (user) {
            if (user) {
                reply(Boom.conflict('Email already in use.'));
            } else {
                reply(true);
            }
        })
        .catch(function (err) {
            reply(Boom.badImplementation(err));
        });
};

var Controller = new ControllerFactory('users', Users)
    .forMethod('signup')
    .withValidation({
        payload: {
            email: Joi.string().email().required(),
            organisation: Joi.string().required(),
            password: Joi.string().required()
        }
    })
    .preProcessWith([
        {assign: 'emailCheck', method: emailCheck}
    ])
    .handleUsing(function (request, reply) {
        var email = request.payload.email;
        var password = request.payload.password;
        var organisation = request.payload.organisation;
        Users.create(email, password, organisation)
            .then(function (user) {
                return (user) ? user.loginSuccess(request.info.remoteAddress, user.email).save() : user;
            })
            .then(function (user) {
                if (user) {
                    var options = {
                        subject: 'Your ' + Config.projectName + ' account',
                        to: {
                            name: request.payload.name,
                            address: email
                        }
                    };
                    Mailer.sendEmail(options, __dirname + '/templates/welcome.hbs.md', request.payload);
                }
                return user;
            })
            .then(function (user) {
                if (!user) {
                    reply(Boom.badImplementation('User could not be created'));
                } else {
                    reply({
                        user: user.email,
                        session: user.session,
                        authHeader: 'Basic ' + new Buffer(user.email + ':' + user.session.key).toString('base64')
                    }).code(201);
                }
            })
            .catch(function (err) {
                reply(Boom.badImplementation(err));
            });
    })
    .findController({
        query: {
            email: Joi.string(),
            isActive: Joi.string()
        }
    }, function (request) {
        var query = {};
        if (request.query.email) {
            query.email = {$regex: new RegExp('^.*?' + request.query.email + '.*$', 'i')};
        }
        return query;
    },
    function (output) {
        output.data = _.map(output.data, function (user) {
            return {
                email: user.email,
                isLoggedIn: user.session ? true : false
            };
        });
        return output;
    })
    .findOneController(function (user) {
        return {
            email: user.email,
            isLoggedIn: user.session ? true: false
        };
    })
    .updateController({
        payload: {
            isActive: Joi.boolean(),
            roles: Joi.array().items(Joi.string()),
            password: Joi.string()
        }
    },
    [],
    'update',
    'update')
    .forMethod('loginForgot')
    .withValidation({
        payload: {
            email: Joi.string().email().required()
        }
    })
    .handleUsing(function (request, reply) {
        Users._findOne({email: request.payload.email})
            .then(function(user) {
                return user ? user.resetPasswordSent(user.email).save() : user;
            })
            .then(function (user) {
                if (user) {
                    var options = {
                        subject: 'Reset your ' + Config.projectName + ' password',
                        to: request.payload.email
                    };
                    return Mailer.sendEmail(options, __dirname + '/templates/forgot-password.hbs.md', {key: user.resetPwd.token});
                }
                return undefined;
            })
            .then(function () {
                reply({message: 'Success.'});
            })
            .catch(function (err) {
                reply(Boom.badImplementation(err));
            });
    })
    .forMethod('loginReset')
    .withValidation({
        payload: {
            key: Joi.string().required(),
            email: Joi.string().email().required(),
            password: Joi.string().required()
        }
    })
    .handleUsing(function (request, reply) {
        Users._findOne({email: request.payload.email, 'resetPwd.expires': {$gt: Date.now()}})
            .then(function (user) {
                if (!user || (request.payload.key !== user.resetPwd.token)) {
                    reply(Boom.badRequest('Invalid email or key.'));
                } else {
                    user._invalidateSession().resetPassword(request.payload.password, user.email).save()
                        .then(function () {
                            reply({message: 'Success.'});
                        });
                }
            })
            .catch(function (err) {
                reply(Boom.badImplementation(err));
            });
    })
    .doneConfiguring();

module.exports = Controller;

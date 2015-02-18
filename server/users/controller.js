'use strict';
var Joi = require('joi');
var Boom = require('boom');
var Config = require('./../../config');
var Users = require('./model');
var Mailer = require('./../common/mailer');
var BaseController = require('./../common/controller').BaseController;

var Controller = {};

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

Controller.find = BaseController.find('users', Users, {
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
});

Controller.findOne = BaseController.findOne('users', Users);

Controller.update = BaseController.update('users', Users, {
    payload: {
        isActive: Joi.boolean(),
        roles: Joi.array().includes(Joi.string()),
        password: Joi.string()
    }
}, []);

Controller.signup = {
    validator: {
        payload: {
            email: Joi.string().email().required(),
            organisation: Joi.string().required(),
            password: Joi.string().required()
        }
    },
    pre: [
        {assign: 'emailCheck', method: emailCheck}
    ],
    handler: function (request, reply) {
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
                        user: user,
                        session: user.session,
                        authHeader: 'Basic ' + new Buffer(user.email + ':' + user.session.key).toString('base64')
                    }).code(201);
                }
            })
            .catch(function (err) {
                reply(Boom.badImplementation(err));
            });
    }
};

var prePopulateUser2 = function (request, reply) {
    Users._findOne({email: request.payload.email})
        .then(function (user) {
            if (!user) {
                reply({message: 'Success.'}).takeover();
            } else {
                reply(user);
            }
        })
        .catch(function (err) {
            reply(Boom.badImplementation(err));
        });
};

Controller.loginForgot = {
    validator: {
        payload: {
            email: Joi.string().email().required()
        }
    },
    pre: [
        {assign: 'user', method: prePopulateUser2}
    ],
    handler: function (request, reply) {
        var foundUser = request.pre.user;
        foundUser.resetPasswordSent(request.pre.user.email).save()
            .then(function () {
                var options = {
                    subject: 'Reset your ' + Config.projectName + ' password',
                    to: request.payload.email
                };
                return Mailer.sendEmail(options, __dirname + '/templates/forgot-password.hbs.md', {key: foundUser.resetPwd.token});
            })
            .then(function () {
                reply({message: 'Success.'});
            })
            .catch(function (err) {
                reply(Boom.badImplementation(err));
            });
    }
};

var prePopulateUser3 = function (request, reply) {
    var conditions = {
        email: request.payload.email,
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
            reply(Boom.badImplementation(err));
        });
};

Controller.loginReset = {
    validator: {
        payload: {
            key: Joi.string().required(),
            email: Joi.string().email().required(),
            password: Joi.string().required()
        }
    },
    pre: [
        {assign: 'user', method: prePopulateUser3}
    ],
    handler: function (request, reply) {
        var user = request.pre.user;
        var key = request.payload.key;
        var token = user.resetPwd.token;
        if (key !== token) {
            reply(Boom.badRequest('Invalid email or key.'));
        } else {
            user._invalidateSession();
            user.resetPassword(request.payload.password, user.email).save()
                .then(function () {
                    reply({message: 'Success.'});
                });
        }
    }
};

module.exports.Controller = Controller;

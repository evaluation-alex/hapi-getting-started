'use strict';
var Joi = require('joi');
var Boom = require('boom');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Config = require('./../../config');
var _ = require('lodash');
var Promise = require('bluebird');
var Users = require('./model');
var Mailer = require('./../common/mailer');
var AuthPlugin = require('./../common/auth');
var BaseController = require('./../common/controller').BaseController;

var Controller = {};

var emailCheck = function (request, reply) {
    Users._findOne({email: request.payload.email})
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
    if (request.query.isActive) {
        query.isActive = request.query.isActive === '"true"';
    }
    return query;
});

Controller.findOne = BaseController.findOne('users', Users);

Controller.update = {
    validator: {
        payload: {
            isActive: Joi.boolean(),
            roles: Joi.array().includes(Joi.string()),
            password: Joi.string()
        }
    },
    pre: [AuthPlugin.preware.ensurePermissions('update', 'users')],
    handler: function (request, reply) {
        var by = request.auth.credentials.user.email;
        Users._findOne({_id: BaseModel.ObjectID(request.params.id)})
            .then(function (user) {
                return (user && request.payload.isActive === false) ? user.deactivate(by) : user;
            })
            .then(function (user) {
                return (user && request.payload.isActive === true) ? user.reactivate(by) : user;
            })
            .then(function (user) {
                return (user && request.payload.roles) ? user.updateRoles(request.payload.roles, by) : user;
            })
            .then(function (user) {
                return (user && request.payload.password) ? user.resetPassword(request.payload.password, by) : user;
            })
            .then(function (user) {
                if (!user) {
                    reply(Boom.notFound('User not found.'));
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
};

Controller.signup = {
    validator: {
        payload: {
            email: Joi.string().email().required(),
            password: Joi.string().required()
        }
    },
    pre: [
        {assign: 'emailCheck', method: emailCheck}
    ],
    handler: function (request, reply) {
        var email = request.payload.email;
        var password = request.payload.password;
        Users.create(email, password)
            .then(function (user) {
                return (user) ? user.signup(user.email) : user;
            })
            .then(function (user) {
                return (user) ? user.loginSuccess(request.info.remoteAddress, user.email) : user;
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
                    Mailer.sendEmail(options, __dirname + '/welcome.hbs.md', request.payload);
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
            if (err) {
                reply(Boom.badImplementation(err));
            }
        })
        .done();
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
        foundUser.resetPasswordSent(request.pre.user.email)
            .then(function () {
                var options = {
                    subject: 'Reset your ' + Config.projectName + ' password',
                    to: request.payload.email
                };
                Mailer.sendEmail(options, __dirname + '/forgot-password.hbs.md', {key: foundUser.resetPwd.token});
            })
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
            if (err) {
                reply(Boom.badImplementation(err));
            }
        })
        .done();
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
            user.resetPassword(request.payload.password, user.email).done();
            reply({message: 'Success.'});
        }
    }
};

module.exports.Controller = Controller;

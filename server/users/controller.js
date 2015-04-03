'use strict';
let Joi = require('joi');
let _ = require('lodash');
let Config = require('./../../config');
let Users = require('./model');
let Mailer = require('./../common/plugins/mailer');
let ControllerFactory = require('./../common/controller-factory');
let utils = require('./../common/utils');
let errors = require('./../common/errors');
var Promise = require('bluebird');
let onlyOwnerAllowed = require('./../common/prereqs/only-owner');
var Controller = new ControllerFactory(Users)
    .customNewController('signup', {
        payload: {
            email: Joi.string().email().required(),
            organisation: Joi.string().required(),
            locale: Joi.string().only(['en', 'hi']).default('en'),
            password: Joi.string().required()
        }
    }, function uniqueCheckQuery (request) {
        return {
            email: request.payload.email,
            organisation: request.payload.organisation
        };
    }, function newUser (request) {
        let email = request.payload.email;
        let password = request.payload.password;
        let organisation = request.payload.organisation;
        let locale = request.payload.locale;
        let ip = utils.ip(request);
        return Users.create(email, organisation, password, locale)
            .then(function (user) {
                return user.loginSuccess(ip, user.email).save();
            })
            .then(function (user) {
                let options = {
                    subject: 'Your ' + Config.projectName + ' account',
                    to: {
                        name: request.payload.email,
                        address: email
                    }
                };
                user = user.afterLogin(ip);
                let m = Mailer.sendEmail(options, __dirname + '/templates/welcome.hbs.md', request.payload);
                /*jshint unused:false*/
                return Promise.join(user, m, function (user, m) {
                    return user;
                });
                /*jshint unused:true*/
            });
    })
    .findController({
        query: {
            email: Joi.string(),
            isActive: Joi.string()
        }
    }, function buildFindQuery (request) {
        return utils.buildQueryFromRequestForFields({}, request, [['email', 'email']]);
    },
    function stripPrivateData (output) {
        output.data = _.map(output.data, function (user) {
            return user.stripPrivateData();
        });
        return output;
    })
    .findOneController([
        onlyOwnerAllowed(Users, 'email')
    ])
    .updateController({
        payload: {
            isActive: Joi.boolean(),
            roles: Joi.array().items(Joi.string()),
            password: Joi.string()
        }
    }, [
        onlyOwnerAllowed(Users, 'email')
    ],
    'update',
    function updateUser (user, request, by) {
        return user._invalidateSession(utils.ip(request), by).updateUser(request, by);
    })
    .forMethod('loginForgot')
    .withValidation({
        payload: {
            email: Joi.string().email().required()
        }
    })
    .handleUsing(function loginForgotHandler (request, reply) {
        Users.findOne({email: request.payload.email})
            .then(function (user) {
                return user ? user.resetPasswordSent(user.email).save() : user;
            })
            .then(function (user) {
                if (user) {
                    let options = {
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
                utils.logAndBoom(err, reply);
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
    .handleUsing(function loginResetHandler (request, reply) {
        Users.findOne({email: request.payload.email, 'resetPwd.expires': {$gt: Date.now()}})
            .then(function (user) {
                if (!user || (request.payload.key !== user.resetPwd.token)) {
                    return Promise.reject(new errors.PasswordResetError());
                }
                return user._invalidateSession(utils.ip(request), user.email).setPassword(request.payload.password, user.email).save();
            })
            .then(function () {
                reply({message: 'Success.'});
            })
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    })
    .doneConfiguring();
module.exports = Controller;

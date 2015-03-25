'use strict';
var Joi = require('joi');
var _ = require('lodash');
var Config = require('./../../config');
var Users = require('./model');
var Preferences = require('./preferences/model');
var Mailer = require('./../common/plugins/mailer');
var ControllerFactory = require('./../common/controller-factory');
var utils = require('./../common/utils');
var errors = require('./../common/errors');
var Promise = require('bluebird');
var onlyOwnerAllowed = require('./../common/prereqs/only-owner');

var Controller = new ControllerFactory(Users)
    .customNewController('signup', {
        payload: {
            email: Joi.string().email().required(),
            organisation: Joi.string().required(),
            password: Joi.string().required()
        }
    }, function uniqueCheckQuery (request) {
        return {
            email: request.payload.email,
            organisation: request.payload.organisation
        };
    }, function newUser (request) {
        var email = request.payload.email;
        var password = request.payload.password;
        var organisation = request.payload.organisation;
        return Users.create(email, password, organisation)
            .then(function (user) {
                return user.loginSuccess(request.info.remoteAddress, user.email).save();
            })
            .then(function (user) {
                var options = {
                    subject: 'Your ' + Config.projectName + ' account',
                    to: {
                        name: request.payload.email,
                        address: email
                    }
                };
                user = user.afterLogin();
                var m = Mailer.sendEmail(options, __dirname + '/templates/welcome.hbs.md', request.payload);
                var pref = Preferences.create(email, organisation, utils.locale(request), email);
                /*jshint unused:false*/
                return Promise.join(user, m, pref, function (user, m, pref) {
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
        var query = {};
        if (request.query.email) {
            query.email = {$regex: new RegExp('^.*?' + request.query.email + '.*$', 'i')};
        }
        return query;
    },
    function stripPrivateData (output) {
        output.data = _.map(output.data, function (user) {
            return user.stripPrivateData();
        });
        return output;
    })
    .findOneController([
        onlyOwnerAllowed(Users, 'email')
    ], function stripPrivateData (user) {
        return user.stripPrivateData();
    })
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
    'update')
    .forMethod('loginForgot')
    .withValidation({
        payload: {
            email: Joi.string().email().required()
        }
    })
    .handleUsing(function loginForgotHandler (request, reply) {
        Users._findOne({email: request.payload.email})
            .then(function (user) {
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
                utils.logAndBoom(err, utils.locale(request), reply);
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
        Users._findOne({email: request.payload.email, 'resetPwd.expires': {$gt: Date.now()}})
            .then(function (user) {
                if (!user || (request.payload.key !== user.resetPwd.token)) {
                    return Promise.reject(new errors.PasswordResetError());
                }
                return user._invalidateSession().resetPassword(request.payload.password, user.email).save();
            })
            .then(function () {
                reply({message: 'Success.'});
            })
            .catch(function (err) {
                utils.logAndBoom(err, utils.locale(request), reply);
            });
    })
    .doneConfiguring();

module.exports = Controller;

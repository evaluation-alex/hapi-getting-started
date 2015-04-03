'use strict';
let Joi = require('joi');
let Users = require('./../model');
let AuthAttempts = require('./auth-attempts/model');
let ControllerFactory = require('./../../common/controller-factory');
let utils = require('./../../common/utils');
let errors = require('./../../common/errors');
var Promise = require('bluebird');
var abuseDetected = function abuseDetected (request, reply) {
    AuthAttempts.abuseDetected(utils.ip(request), request.payload.email)
        .then(function (detected) {
            if (detected) {
                return Promise.reject(new errors.AbusiveLoginAttemptsError());
            }
            reply(false);
        })
        .catch(function (err) {
            utils.logAndBoom(err, reply);
        });
};
var Controller = new ControllerFactory()
    .forMethod('login')
    .withValidation({
        payload: {
            email: Joi.string().required(),
            password: Joi.string().required()
        }
    })
    .preProcessWith([
        {assign: 'abuseDetected', method: abuseDetected}
    ])
    .handleUsing(function loginHandler (request, reply) {
        let email = request.payload.email;
        let password = request.payload.password;
        let ip = utils.ip(request);
        Users.findByCredentials(email, password)
            .then(function (user) {
                return user.loginSuccess(ip, user.email).save();
            })
            .then(function (user) {
                reply(user.afterLogin(ip));
            })
            .catch(function (err) {
                AuthAttempts.create(ip, email);
                utils.logAndBoom(err, reply);
            });
    })
    .forMethod('logout')
    .handleUsing(function logoutHandler (request, reply) {
        let user = request.auth.credentials.user;
        user.logout(utils.ip(request), user.email).save()
            .then(function () {
                reply({message: 'Success.'});
            });
    })
    .doneConfiguring();
module.exports = Controller;

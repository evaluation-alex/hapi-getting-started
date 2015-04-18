'use strict';
let Joi = require('joi');
let Users = require('./../model');
let AuthAttempts = require('./auth-attempts/model');
let ControllerFactory = require('./../../common/controller-factory');
let utils = require('./../../common/utils');
let errors = require('./../../common/errors');
let Promise = require('bluebird');
let abuseDetected = (request, reply) => {
    AuthAttempts.abuseDetected(utils.ip(request), request.payload.email)
        .then((detected) => {
            if (detected) {
                return Promise.reject(new errors.AbusiveLoginAttemptsError());
            }
            reply(false);
        })
        .catch((err) => utils.logAndBoom(err, reply));
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
    .handleUsing((request, reply) => {
        let email = request.payload.email;
        let password = request.payload.password;
        let ip = utils.ip(request);
        Users.findByCredentials(email, password)
            .then((user) => user.loginSuccess(ip, user.email).save())
            .then((user) => reply(user.afterLogin(ip)))
            .catch((err) => {
                AuthAttempts.create(ip, email);
                utils.logAndBoom(err, reply);
            });
    })
    .forMethod('logout')
    .handleUsing((request, reply) => {
        let user = request.auth.credentials.user;
        user.logout(utils.ip(request), user.email).save()
            .then(() => reply({message: 'Success.'}));
    })
    .doneConfiguring();
module.exports = Controller;

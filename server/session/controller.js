'use strict';
var Joi = require('joi');
var Boom = require('boom');
var Users = require('./../users/model');
var AuthAttempts = require('./../auth-attempts/model');
var ControllerFactory = require('./../common/controller-factory');
var utils = require('./../common/utils');

var abuseDetected = function (request, reply) {
    AuthAttempts.abuseDetected(request.info.remoteAddress, request.payload.email)
        .then(function (detected) {
            if (detected) {
                reply(Boom.tooManyRequests('Maximum number of auth attempts reached. Please try again later.'));
            } else {
                reply();
            }
        })
        .catch(function (err) {
            utils.logAndBoom(err, reply);
        });
};

var Controller = new ControllerFactory('session', null)
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
    .handleUsing(function (request, reply) {
        var email = request.payload.email;
        var password = request.payload.password;
        var ip = request.info.remoteAddress;
        Users.findByCredentials(email, password)
            .then(function (user) {
                return user.loginSuccess(ip, user.email).save();
            })
            .then(function (user) {
                reply({
                    user: user.email,
                    session: user.session,
                    authHeader: 'Basic ' + new Buffer(user.email + ':' + user.session.key).toString('base64')
                });
            })
            .catch(function (err) {
                AuthAttempts.create(ip, email);
                if (err.type === 'UserNotFoundError') {
                    reply(Boom.notFound('user ' + email + ' not found'));
                } else if (err.type === 'IncorrectPasswordError') {
                    err.user.loginFail(ip, ip).save();
                    reply(Boom.unauthorized('Invalid password'));
                } else {
                    utils.logAndBoom(err, reply);
                }
            });
    })
    .forMethod('logout')
    .handleUsing(function (request, reply) {
        var user = request.auth.credentials.user;
        user.logout(request.info.remoteAddress, user.email).save()
            .then(function () {
                reply({message: 'Success.'});
            });
    })
    .doneConfiguring();

module.exports = Controller;

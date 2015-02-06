'use strict';
var Joi = require('joi');
var Config = require('./../../config');
var Boom = require('boom');
var Promise = require('bluebird');
var Users = require('./../users/model');
var AuthAttempts = require('./../auth-attempts/model');
var Mailer = require('./../common/mailer');

var abuseDetected = function (request, reply) {
    var ip = request.info.remoteAddress;
    var email = request.payload.email;
    AuthAttempts.abuseDetected(ip, email)
        .then(function (detected) {
            if (detected) {
                reply(Boom.tooManyRequests('Maximum number of auth attempts reached. Please try again later.'));
            } else {
                reply();
            }
        })
        .catch(function (err) {
            if (err) {
                reply(Boom.badImplementation(err));
            }
        })
        .done();
};

var prePopulateUser = function (request, reply) {
    var email = request.payload.email;
    var password = request.payload.password;
    Users.findByCredentials(email, password)
        .then(function (user) {
            if (!user) {
                reply(Boom.notFound('user ' + email + ' not found'));
            } else {
                if (user.fail === true) {
                    user.user.loginFail(request.info.remoteAddress, request.info.remoteAddress);
                    reply(Boom.unauthorized('Invalid password'));
                } else {
                    reply(user);
                }
            }
            if (!user || user.fail) {
                AuthAttempts.create(request.info.remoteAddress, request.payload.email).done();
            }
        })
        .catch(function (err) {
            if (err) {
                reply(Boom.badImplementation(err));
            }
        })
        .done();
};

var Controller = {

};

Controller.login = {
    validator: {
        payload: {
            email: Joi.string().required(),
            password: Joi.string().required()
        }
    },
    pre: [
        {assign: 'abuseDetected', method: abuseDetected},
        {assign: 'user', method: prePopulateUser}
    ],
    handler: function (request, reply) {
        var user = request.pre.user;
        user.loginSuccess(request.info.remoteAddress, user.email)
            .then(function(user) {
                var credentials = user.email + ':' + user.session.key;
                var authHeader = 'Basic ' + new Buffer(credentials).toString('base64');
                reply({
                    user: user,
                    session: user.session,
                    authHeader: authHeader
                });
            })
            .catch(function(err) {
                if(err) {
                    reply(Boom.badImplementation(err));
                }
            });
    }
};

Controller.logout = {
    handler: function (request, reply) {
        var user = request.auth.credentials.user;
        user.logout(request.info.remoteAddress, user.email).done();
        reply({message: 'Success.'});
    }
};

module.exports.Controller = Controller;
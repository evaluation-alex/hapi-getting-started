'use strict';
let schemas = require('./schemas');
let _ = require('lodash');
let Config = require('./../../config');
let Users = require('./model');
let Mailer = require('./../common/plugins/mailer');
let ControllerFactory = require('./../common/controller-factory');
let utils = require('./../common/utils');
let errors = require('./../common/errors');
let Bluebird = require('bluebird');
let onlyOwnerAllowed = require('./../common/prereqs/only-owner');
var Controller = new ControllerFactory(Users)
    .customNewController('signup', schemas.signup, (request) => {
        return {
            email: request.payload.email,
            organisation: request.payload.organisation
        };
    }, (request) => {
        let email = request.payload.email;
        let password = request.payload.password;
        let organisation = request.payload.organisation;
        let locale = request.payload.locale;
        let ip = utils.ip(request);
        return Users.create(email, organisation, password, locale)
            .then((user) => user.loginSuccess(ip, user.email).save())
            .then((user) => {
                let options = {
                    subject: 'Your ' + Config.projectName + ' account',
                    to: {
                        name: request.payload.email,
                        address: email
                    }
                };
                /*jshint unused:false*/
                return Bluebird.join(user.afterLogin(ip),
                    Mailer.sendEmail(options, __dirname + '/templates/welcome.hbs.md', request.payload),
                    (user, m) => user
                );
                /*jshint unused:true*/
            });
    })
    .findController(schemas.find, (request) => utils.buildQueryForPartialMatch({}, request, [['email', 'email']]),
    (output) => {
        output.data = _.map(output.data, (user) => user.stripPrivateData());
        return output;
    })
    .findOneController([
        onlyOwnerAllowed(Users, 'email')
    ])
    .updateController(schemas.update, [
        onlyOwnerAllowed(Users, 'email')
    ],
    'update',
    (user, request, by) => user._invalidateSession(utils.ip(request), by).updateUser(request, by))
    .forMethod('loginForgot')
    .withValidation(schemas.loginForgot)
    .handleUsing((request, reply) => {
        Users.findOne({email: request.payload.email})
            .then((user) => user ? user.resetPasswordSent(user.email).save() : user)
            .then((user) => {
                if (user) {
                    let options = {
                        subject: 'Reset your ' + Config.projectName + ' password',
                        to: request.payload.email
                    };
                    return Mailer.sendEmail(options, __dirname + '/templates/forgot-password.hbs.md', {key: user.resetPwd.token});
                }
                return undefined;
            })
            .then(() => reply({message: 'Success.'}))
            .catch((err) => utils.logAndBoom(err, reply));
    })
    .forMethod('loginReset')
    .withValidation(schemas.loginReset)
    .handleUsing((request, reply) => {
        Users.findOne({email: request.payload.email, 'resetPwd.expires': {$gt: Date.now()}})
            .then((user) => {
                if (!user || (request.payload.key !== user.resetPwd.token)) {
                    return Bluebird.reject(new errors.PasswordResetError());
                }
                return user._invalidateSession(utils.ip(request), user.email).setPassword(request.payload.password, user.email).save();
            })
            .then(() => reply({message: 'Success.'}))
            .catch((err) => utils.logAndBoom(err, reply));
    })
    .doneConfiguring();
module.exports = Controller;

'use strict';
const pre = require('./../common/prereqs');
const post = require('./../common/posthandlers');
const utils = require('./../common/utils');
const {ip, logAndBoom} = utils;
const {abuseDetected} = pre;
const {hashCodeOn} = post;
const Users = require('./../users/model');
const AuthAttempts = require('./../auth-attempts/model');
const schemas = require('./schemas');
module.exports = {
    login: {
        validate: schemas.controller.login,
        pre: [
            abuseDetected()
        ],
        handler(request, reply) {
            const {email, password} = request.payload;
            const ipadrs = ip(request);
            Users.findByCredentials(email, password)
                .then(user => user.loginSuccess(ipadrs, user.email).save())
                .then(user => user.afterLogin(ipadrs))
                .catch(err => AuthAttempts.create(ipadrs, email).then(() => logAndBoom(err)))
                .then(reply);
        },
        post: [
            hashCodeOn(Users)
        ]
    },
    logout: {
        handler(request, reply) {
            let user = request.auth.credentials.user;
            user.logout(ip(request), user.email).save()
                .then(() => ({message: 'Success.'}))
                .then(reply);
        }
    }
};

'use strict';
const {ip, logAndBoom} = require('./../../common/utils');
const {abuseDetected} = require('./../../common/prereqs');
const Users = require('./../model');
const AuthAttempts = require('./auth-attempts/model');
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
                .catch(err => {
                    AuthAttempts.create(ipadrs, email);
                    return logAndBoom(err);
                })
                .then(reply);
        }
    },
    logout: {
        handler(request, reply) {
            let user = request.auth.credentials.user;
            user.logout(ip(request), user.email).save()
                .then(() => {
                    return {message: 'Success.'};
                })
                .then(reply);
        }
    }
};

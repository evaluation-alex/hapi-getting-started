'use strict';
const Bluebird = require('bluebird');
const pre = require('./../common/prereqs');
const post = require('./../common/posthandlers');
const utils = require('./../common/utils');
const {ip, logAndBoom} = utils;
const {abuseDetected} = pre;
const {buildPostHandler, hashCodeOn} = post;
const Users = require('./../users/model');
const AuthAttempts = require('./../auth-attempts/model');
const Blogs = require('./../blogs/model');
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
            buildPostHandler({collection: Users.collection, method: 'populateMyBlogs'}, (request, user) => {
                return Bluebird.join(
                    Blogs.find({organisation: user.organisation, owners: user.user}),
                    Blogs.find({organisation: user.organisation, contributors: user.user}),
                    Blogs.find({organisation: user.organisation, subscribers: user.user}),
                    (owned, contributed, subscribed) => {
                        user.blogs = {owned, contributed, subscribed};
                        return user;
                    });
            }),
            hashCodeOn(Users)
        ]
    },
    logout: {
        handler(request, reply) {
            const user = request.auth.credentials.user;
            user.logout(ip(request), user.email).save()
                .then(() => ({message: 'Success.'}))
                .then(reply);
        }
    }
};

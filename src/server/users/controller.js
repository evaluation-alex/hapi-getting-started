'use strict';
const path = require('path');
const Bluebird = require('bluebird');
const config = require('./../config');
const Mailer = require('./../plugins/mailer');
const errors = require('./../common/errors');
const utils = require('./../common/utils');
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const post = require('./../common/posthandlers');
const {PasswordResetError} = errors;
const {ip, logAndBoom} = utils;
const {uniqueCheck, canView, canUpdate, onlyOwner, prePopulate, buildMongoQuery} = pre;
const {buildCreateHandler, buildFindHandler, buildFindOneHandler, buildUpdateHandler} = handlers;
const {buildPostHandler, hashCodeOn, populateObject} = post;
const Users = require('./model');
const Blogs = require('./../blogs/model');
const schema = require('./../../shared/rest-api')(require('joi'), require('./../lodash')).users;
const {projectName} = config;
module.exports = {
    signup: {
        validate: schema.signup,
        pre: [
            uniqueCheck(Users, request => {
                return {
                    email: request.payload.email,
                    organisation: request.payload.organisation
                };
            })
        ],
        handler: buildCreateHandler(Users),
        post: [
            buildPostHandler({collection: Users.collection, method: 'createFirstBlog'}, (request) => {
                const user = request.payload.email;
                const org = request.payload.organisation;
                const groups = [user];
                return Blogs.create(`${user}'s private blog`, 'Get started', groups, groups, groups, [], false, 'restricted', true, user, org);
            }),
            buildPostHandler({collection: Users.collection, method: 'sendWelcomeEmail'}, (request) => {
                const options = {
                    subject: `Your  ${projectName} account`,
                    to: {
                        name: request.payload.email,
                        address: request.payload.email
                    }
                };
                return Mailer.sendEmail(options, path.join(__dirname, '/templates/welcome.hbs.md'), request.payload);
            }),
            hashCodeOn(Users)
        ]
    },
    find: {
        validate: schema.find,
        pre: [
            canView(Users.collection),
            buildMongoQuery(Users, schema.findOptions)
        ],
        handler: buildFindHandler(Users),
        post: [
            populateObject(Users),
            hashCodeOn(Users)
        ]
    },
    findOne: {
        validate: schema.findOne,
        pre: [
            canView(Users.collection),
            prePopulate(Users, 'id'),
            onlyOwner(Users)
        ],
        handler: buildFindOneHandler(Users),
        post: [
            populateObject(Users),
            hashCodeOn(Users)
        ]
    },
    update: {
        validate: schema.update,
        pre: [
            prePopulate(Users, 'id'),
            canUpdate(Users.collection),
            onlyOwner(Users)
        ],
        handler: buildUpdateHandler(Users, (usr, request, e) => usr._invalidateSession(ip(request), e).updateUser(request, e)),
        post: [
            hashCodeOn(Users)
        ]
    },
    forgot: {
        validate: schema.forgot,
        handler(request, reply) {
            Users.findOne({email: request.payload.email})
                .then(user => user ? user.resetPasswordSent(user.email).save() : user)
                .then(user => {
                    if (user) {
                        const options = {
                            subject: `Reset your ${projectName} password`,
                            to: request.payload.email
                        };
                        return Mailer.sendEmail(options, path.join(__dirname, '/templates/forgot-password.hbs.md'), {key: user.resetPwd.token});
                    }
                })
                .then(() => ({message: 'Success.'}))
                .catch(logAndBoom)
                .then(reply);
        }
    },
    reset: {
        validate: schema.reset,
        handler(request, reply) {
            Users.findOne({email: request.payload.email, 'resetPwd.expires': {$gt: Date.now()}})
                .then(user => {
                    if (!user || (request.payload.key !== user.resetPwd.token)) {
                        return Bluebird.reject(new PasswordResetError());
                    }
                    return user._invalidateSession(ip(request), user.email).setPassword(request.payload.password, user.email).save();
                })
                .then(() => ({message: 'Success.'}))
                .catch(logAndBoom)
                .then(reply);
        }
    }
};

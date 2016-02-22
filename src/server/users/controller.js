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
const {uniqueCheck, findValidator, canView, canUpdate, onlyOwner, prePopulate, buildMongoQuery} = pre;
const {buildCreateHandler, buildFindHandler, buildFindOneHandler, buildUpdateHandler} = handlers;
const {buildPostHandler, hashCodeOn, populateObject} = post;
const schemas = require('./schemas');
const Users = require('./model');
const Blogs = require('./../blogs/model');
const {projectName} = config;
module.exports = {
    signup: {
        validate: schemas.controller.signup,
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
        validate: findValidator(schemas.controller.find, schemas.controller.findDefaults),
        pre: [
            canView(Users.collection),
            buildMongoQuery(Users, schemas.controller.findOptions)
        ],
        handler: buildFindHandler(Users),
        post: [
            populateObject(Users),
            hashCodeOn(Users)
        ]
    },
    findOne: {
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
        validate: schemas.controller.update,
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
        validate: schemas.controller.forgot,
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
        validate: schemas.controller.reset,
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
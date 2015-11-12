'use strict';
import path from 'path';
import Bluebird from 'bluebird';
import config from './../config';
import {sendEmail} from './../common/plugins/mailer';
import {PasswordResetError} from './../common/errors';
import {ip, buildQuery, logAndBoom} from './../common/utils';
import {uniqueCheck, findValidator, canView, canUpdate, onlyOwner, prePopulate} from './../common/prereqs';
import {buildCreateHandler, buildFindHandler, buildFindOneHandler, buildUpdateHandler} from './../common/handlers';
import schemas from './schemas';
import Users from './model';
const {projectName} = config;
export default {
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
            {
                method(request, reply) {
                    if (!request.response.isBoom) {
                        const options = {
                            subject: `Your  ${projectName} account`,
                            to: {
                                name: request.payload.email,
                                address: request.payload.email
                            }
                        };
                        sendEmail(options, path.join(__dirname, '/templates/welcome.hbs.md'), request.payload)
                            .then(() => {
                                reply.continue();
                            })
                            .catch(err => {
                                reply(logAndBoom(err));
                            });
                    } else {
                        return reply.continue();
                    }
                }
            }
        ]
    },
    find: {
        validate: findValidator(schemas.controller.find),
        pre: [
            canView(Users.collection)
        ],
        handler: buildFindHandler(Users, request => buildQuery(request, schemas.controller.findOptions))
    },
    findOne: {
        pre: [
            canView(Users.collection),
            prePopulate(Users, 'id'),
            onlyOwner(Users)
        ],
        handler: buildFindOneHandler(Users)
    },
    update: {
        validate: schemas.controller.update,
        pre: [
            canUpdate(Users.collection),
            prePopulate(Users, 'id'),
            onlyOwner(Users)
        ],
        handler: buildUpdateHandler(Users, (usr, request, e) => usr._invalidateSession(ip(request), e).updateUser(request, e))
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
                        return sendEmail(options, path.join(__dirname, '/templates/forgot-password.hbs.md'), {key: user.resetPwd.token});
                    }
                })
                .then(() => {
                    return {message: 'Success.'};
                })
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
                .then(() => {
                    return {message: 'Success.'};
                })
                .catch(logAndBoom)
                .then(reply);
        }
    }
};

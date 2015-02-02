'use strict';
var Joi = require('joi');
var Boom = require('boom');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Config = require('./../../config').config({argv: []});
var _ = require('lodash');
var Promise = require('bluebird');
var Users = require('./model');
var Mailer = require('./../common/mailer');
var AuthPlugin = require('./../common/auth');

var emailCheck = function (request, reply) {
    Users._findOne({email: request.payload.email})
        .then(function (user) {
            if (user) {
                reply(Boom.conflict('Email already in use.'));
            } else {
                reply(true);
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

Controller.find = {
    validator: {
        query: {
            email: Joi.string(),
            isActive: Joi.string(),
            fields: Joi.string(),
            sort: Joi.string(),
            limit: Joi.number().default(20),
            page: Joi.number().default(1)
        }
    },
    pre: [AuthPlugin.preware.ensurePermissions('view', 'users')],
    handler: function (request, reply) {
        var query = {};
        if (request.query.email) {
            query.email = {$regex: new RegExp('^.*?' + request.query.email + '.*$', 'i')};
        }
        if (request.query.isActive) {
            query.isActive = request.query.isActive === '"true"';
        }
        var fields = request.query.fields;
        var sort = request.query.sort;
        var limit = request.query.limit;
        var page = request.query.page;
        Users.pagedFind(query, fields, sort, limit, page, function (err, results) {
            if (err) {
                reply(Boom.badImplementation(err));
            } else {
                reply(results);
            }
        });
    }
};

Controller.findOne = {
    pre: [AuthPlugin.preware.ensurePermissions('view', 'users')],
    handler: function (request, reply) {
        Users._findOne({_id: BaseModel.ObjectID(request.params.id)})
            .then(function (user) {
                if (!user) {
                    reply(Boom.notFound('Document not found.'));
                } else {
                    reply(user);
                }
            })
            .catch(function (err) {
                if (err) {
                    reply(Boom.badImplementation(err));
                }
            })
            .done();
    }
};

Controller.update = {
    validator: {
        payload: {
            isActive: Joi.boolean(),
            roles: Joi.array().includes(Joi.string()),
            password: Joi.string()
        }
    },
    pre: [AuthPlugin.preware.ensurePermissions('update', 'users')],
    handler: function (request, reply) {
        Users._findOne({_id: BaseModel.ObjectID(request.params.id)})
            .then(function (user) {
                if (!user) {
                    reply(Boom.notFound('User not found.'));
                } else {
                    var p = [user];
                    var by = request.auth.credentials.user.email;
                    if (request.payload.isActive === false) {
                        p.push(user.deactivate(by));
                    }
                    if (request.payload.isActive === true) {
                        p.push(user.reactivate(by));
                    }
                    if (request.payload.roles) {
                        p.push(user.updateRoles(request.payload.roles, by));
                    }
                    if (request.payload.password) {
                        p.push(user.resetPassword(request.payload.password, by));
                    }
                    return Promise.all(p);
                }
            })
            .then(function (u) {
                reply(u[0]);
            })
            .catch(function (err) {
                if (err) {
                    reply(Boom.badImplementation(err));
                }
            })
            .done();
    }
};

Controller.signup = {
    validator: {
        payload: {
            email: Joi.string().email().required(),
            password: Joi.string().required()
        }
    },
    pre: [
        {assign: 'emailCheck', method: emailCheck}
    ],
    handler: function (request, reply) {
        var email = request.payload.email;
        var password = request.payload.password;
        Users.create(email, password)
            .then(function (user) {
                if (!user) {
                    reply(Boom.badImplementation('User could not be created'));
                } else {
                    var signupP = user.signup(user.email);
                    var loginP = user.loginSuccess(request.info.remoteAddress, user.email);
                    var options = {
                        subject: 'Your ' + Config.projectName + ' account',
                        to: {
                            name: request.payload.name,
                            address: email
                        }
                    };
                    var mailerP = Mailer.sendEmail(options, __dirname + '/welcome.hbs.md', request.payload);
                    return Promise.join(signupP, loginP, mailerP, function (s, l, m) {
                        var credentials = user.email + ':' + user.session.key;
                        var authHeader = 'Basic ' + new Buffer(credentials).toString('base64');
                        return {
                            user: user,
                            session: user.session,
                            authHeader: authHeader
                        };
                    });
                }
            })
            .then(function (r) {
                reply(r);
            })
            .catch(function (err) {
                if (err) {
                    reply(Boom.badImplementation(err));
                }
            })
            .done();
    }
};

var prePopulateUser2 = function (request, reply) {
    Users._findOne({email: request.payload.email})
        .then(function (user) {
            if (!user) {
                reply({message: 'Success.'}).takeover();
            } else {
                reply(user);
            }
        })
        .catch(function (err) {
            if (err) {
                reply(Boom.badImplementation(err));
            }
        })
        .done();
};

Controller.loginForgot = {
    validator: {
        payload: {
            email: Joi.string().email().required()
        }
    },
    pre : {
        user: prePopulateUser2
    },
    handler: function (request, reply) {
        var user = request.pre.user;
        Users._findOne({_id: user._id})
            .then(function (foundUser) {
                var options = {
                    subject: 'Reset your ' + Config.projectName + ' password',
                    to: request.payload.email
                };
                var p1 = foundUser.resetPasswordSent(request.pre.user.email);
                var p2 = Mailer.sendEmail(options, __dirname + '/forgot-password.hbs.md', {key: foundUser.resetPwd.token});
                return Promise.join(p1, p2)
                    .then(function (v1, v2) {
                        reply({message: 'Success.'});
                    });
            })
            .catch(function (err) {
                if (err) {
                    reply(Boom.badImplementation(err));
                }
            })
            .done();
    }
};

var prePopulateUser3 = function (request, reply) {
    var conditions = {
        email: request.payload.email,
        'resetPwd.expires': {$gt: Date.now()}
    };
    Users._findOne(conditions)
        .then(function (user) {
            if (!user) {
                reply(Boom.badRequest('Invalid email or key.'));
            } else {
                reply(user);
            }
        })
        .catch(function (err) {
            if (err) {
                reply(Boom.badImplementation(err));
            }
        })
        .done();
};

Controller.loginReset = {
    validator: {
        payload: {
            key: Joi.string().required(),
            email: Joi.string().email().required(),
            password: Joi.string().required()
        }
    },
    pre: [
        {assign: 'user', method: prePopulateUser3}
    ],
    handler: function (request, reply) {
        var key = request.payload.key;
        var token = request.pre.user.resetPwd.token;
        if (key !== token) {
            reply(Boom.badRequest('Invalid email or key.'));
        } else {
            var user = request.pre.user;
            user.resetPassword(request.payload.password, request.pre.user.email).done();
            reply({message: 'Success.'});
        }
    }
};

module.exports.Controller = Controller;

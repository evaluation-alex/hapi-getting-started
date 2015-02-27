'use strict';
var Joi = require('joi');
var Boom = require('boom');
var AuthPlugin = require('./../common/auth');
var BaseModel = require('hapi-mongo-models').BaseModel;
var _ = require('lodash');
var Users = require('./../users/model');
var PreReqs = require('./pre-reqs');

var ControllerFactory = function (component, model) {
    var self = this;
    self.controller = {};
    self.addedToServer = false;
    self._canContinueConfiguring = function () {
        if (!self.addedToServer) {
            return self;
        } else {
            throw new Error('Controller already configured, cannot modify now');
        }
    };
    self.forMethod = function (method) {
        if (self._canContinueConfiguring()) {
            self.method = method;
            self.controller[self.method] = {};
        }
        return self;
    };
    self.withValidation = function (validator) {
        if (self._canContinueConfiguring()) {
            self.controller[self.method].validate = validator;
        }
        return self;
    };
    self.preProcessWith = function (preProcess) {
        if (self._canContinueConfiguring()) {
            if (!self.controller[self.method].pre) {
                self.controller[self.method].pre = [];
            }
            if (_.isArray(preProcess)) {
                preProcess.forEach(function (pre) {
                    self.controller[self.method].pre.push(pre);
                });
            } else {
                self.controller[self.method].pre.push(preProcess);
            }
        }
        return self;
    };
    self.handleUsing = function (handler) {
        if (self._canContinueConfiguring()) {
            self.controller[self.method].handler = handler;
        }
        return self;
    };
    self.doneConfiguring = function () {
        if (!self.addedToServer) {
            self.addedToServer = true;
        } else {
            throw new Error('already created controller, create new controller before registering with server again');
        }
        return self.controller;
    };
    self.findHandler = function (queryBuilder) {
        return function (request, reply) {
            var query = queryBuilder(request);
            query.organisation = query.organisation || {$regex: new RegExp('^.*?' + request.auth.credentials.user.organisation + '.*$', 'i')};
            if (request.query.isActive) {
                query.isActive = request.query.isActive === '"true"';
            }
            var fields = request.query.fields;
            var sort = request.query.sort;
            var limit = request.query.limit;
            var page = request.query.page;
            model.pagedFind(query, fields, sort, limit, page, function (err, results) {
                if (err) {
                    reply(Boom.badImplementation(err));
                } else {
                    reply(results);
                }
            });
        };
    };
    self.findController = function (validator, queryBuilder) {
        validator.query.fields = Joi.string();
        validator.query.sort = Joi.string();
        validator.query.limit = Joi.number().default(20);
        validator.query.page = Joi.number().default(1);
        self.forMethod('find')
            .withValidation(validator)
            .preProcessWith(AuthPlugin.preware.ensurePermissions('view', component))
            .handleUsing(self.findHandler(queryBuilder));
        return self;
    };
    self.findOneHandler = function (findOneCb) {
        return function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            model._findOne({_id: id})
                .then(function (f) {
                    if (!f) {
                        reply(Boom.notFound(component + ' (' + id.toString() + ' ) not found'));
                    } else {
                        reply(findOneCb ? findOneCb(f) : f);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        };
    };
    self.findOneController = function (findOneCb) {
        self.forMethod('findOne')
            .preProcessWith(AuthPlugin.preware.ensurePermissions('view', component))
            .handleUsing(self.findOneHandler(findOneCb));
        return self;
    };
    self.updateHandler = function (updateCb) {
        return function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            model._findOne({_id: id})
                .then(function (f) {
                    if (!f) {
                        reply(Boom.notFound(component + ' (' + id.toString() + ' ) not found'));
                        return false;
                    } else {
                        var by = request.auth.credentials.user.email;
                        if (_.isFunction(updateCb)) {
                            return updateCb(f, request, by).save();
                        } else {
                            return f[updateCb](request, by).save();
                        }
                    }
                })
                .then(function (f) {
                    if (f) {
                        reply(f);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        };
    };

    self.updateController = function (validator, prereqs, methodName, updateCb) {
        var perms = _.find(prereqs, function (prereq) {
            return prereq.assign === 'ensurePermissions';
        });
        var pre = _.flatten([perms ? [] : AuthPlugin.preware.ensurePermissions('update', component), prereqs]);
        self.forMethod(methodName)
            .preProcessWith(pre)
            .handleUsing(self.updateHandler(updateCb));
        return self;
    };
    self.newHandler = function (newCb) {
        return function (request, reply) {
            var by = request.auth.credentials.user.email;
            newCb ? newCb(request, by) : model.newObject(request, by)
                .then(function (n) {
                    if (!n) {
                        reply(Boom.notFound(component + ' could not be created.'));
                    } else {
                        reply(n).code(201);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        };
    };
    self.newController = function (validator, prereqs, uniqueCheck, newCb) {
        var pre = _.flatten([AuthPlugin.preware.ensurePermissions('update', component),
            {assign: 'isUnique', method: PreReqs.isUnique(model, uniqueCheck)},
            prereqs]);
        self.forMethod('new')
            .preProcessWith(pre)
            .handleUsing(self.newHandler(newCb));
        return self;
    };
    self.deleteController = function (pre) {
        return self.updateController(undefined, pre ? pre : [], 'delete', 'del');
    };
    self.joinApproveRejectController = function (actions, toAdd, approvers) {
        var validator = {
            payload: {}
        };
        validator.payload[toAdd] = Joi.array().includes(Joi.string()).unique();
        self.updateController(validator, [
            AuthPlugin.preware.ensurePermissions('view', component),
            {assign: 'validMembers', method: PreReqs.areValid(Users, 'email', toAdd)}
        ], actions[0], 'join');
        self.updateController(validator, [
            {assign: 'validAndPermitted', method: PreReqs.validAndPermitted(model, 'id', [approvers])},
            {assign: 'validMembers', method: PreReqs.areValid(Users, 'email', toAdd)}
        ], actions[1], 'approve');
        self.updateController(validator, [
            {assign: 'validAndPermitted', method: PreReqs.validAndPermitted(model, 'id', [approvers])},
            {assign: 'validMembers', method: PreReqs.areValid(Users, 'email', toAdd)}
        ], actions[2], 'reject');
        return self;
    };

    return self;
};

module.exports = ControllerFactory;

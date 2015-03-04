'use strict';
var Joi = require('joi');
var Boom = require('boom');
var _ = require('lodash');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Users = require('./../users/model');
var PreReqs = require('./pre-reqs');
var utils = require('./utils');

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
    self.newHandler = function (newCb) {
        return function (request, reply) {
            var by = request.auth.credentials.user.email;
            var newObj = newCb ? newCb(request, by) : model.newObject(request, by);
            newObj.then(function (n) {
                if (!n) {
                    reply(Boom.notFound(component + ' could not be created.'));
                } else {
                    reply(n).code(201);
                }
            }).catch(function (err) {
                utils.logAndBoom(err, reply);
            });
        };
    };
    self.newController = function (validator, prereqs, uniqueCheck, newCb) {
        var pre = _.flatten([PreReqs.ensurePermissions('update', component),
            {assign: 'isUnique', method: PreReqs.isUnique(model, uniqueCheck)},
            prereqs]);
        self.forMethod('new')
            .preProcessWith(pre)
            .handleUsing(self.newHandler(newCb));
        return self;
    };
    self.findHandler = function (queryBuilder, findCb) {
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
            model._pagedFind(query, fields, sort, limit, page)
                .then(function (output) {
                    return findCb ? findCb(output) : output;
                })
                .then(function (output) {
                    reply(output);
                })
                .catch(function (err) {
                    utils.logAndBoom(err, reply);
                });
        };
    };
    self.findController = function (validator, queryBuilder, findCb) {
        validator.query.fields = Joi.string();
        validator.query.sort = Joi.string();
        validator.query.limit = Joi.number().default(20);
        validator.query.page = Joi.number().default(1);
        self.forMethod('find')
            .withValidation(validator)
            .preProcessWith(PreReqs.ensurePermissions('view', component))
            .handleUsing(self.findHandler(queryBuilder, findCb));
        return self;
    };
    self.findOneHandler = function (findOneCb) {
        return function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            model._findOne({_id: id})
                .then(function (f) {
                    if (!f) {
                        return Boom.notFound(component + ' (' + id.toString() + ' ) not found');
                    } else {
                        return findOneCb ? findOneCb(f) : f;
                    }
                })
                .then(function (f) {
                    reply(f);
                })
                .catch(function (err) {
                    utils.logAndBoom(err, reply);
                });
        };
    };
    self.findOneController = function (findOneCb) {
        self.forMethod('findOne')
            .preProcessWith(PreReqs.ensurePermissions('view', component))
            .handleUsing(self.findOneHandler(findOneCb));
        return self;
    };
    self.updateHandler = function (updateCb) {
        return function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            model._findOne({_id: id})
                .then(function (f) {
                    if (!f) {
                        return Boom.notFound(component + ' (' + id.toString() + ' ) not found');
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
                    reply(f);
                })
                .catch(function (err) {
                    utils.logAndBoom(err);
                });
        };
    };
    self.updateController = function (validator, prereqs, methodName, updateCb) {
        var perms = _.find(prereqs, function (prereq) {
            return prereq.assign === 'ensurePermissions';
        });
        var pre = _.flatten([perms ? [] : PreReqs.ensurePermissions('update', component), prereqs]);
        self.forMethod(methodName)
            .preProcessWith(pre)
            .handleUsing(self.updateHandler(updateCb));
        return self;
    };
    self.deleteController = function (pre) {
        return self.updateController(undefined, pre ? pre : [], 'delete', 'del');
    };
    self.joinApproveRejectController = function (actions, toAdd, approvers) {
        var validator = {
            payload: {}
        };
        validator.payload[toAdd] = Joi.array().items(Joi.string()).unique();
        self.updateController(validator, [
            PreReqs.ensurePermissions('view', component),
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

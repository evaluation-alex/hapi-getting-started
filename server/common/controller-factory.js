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
    self.component = component;
    self.model = model;
    return self;
};
ControllerFactory.prototype.forMethod = function (method) {
    var self = this;
    self.method = method;
    self.controller[self.method] = {};
    return self;
};
ControllerFactory.prototype.withValidation = function (validator) {
    var self = this;
    self.controller[self.method].validate = validator;
    return self;
};
ControllerFactory.prototype.preProcessWith = function (preProcess) {
    var self = this;
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
    return self;
};
ControllerFactory.prototype.handleUsing = function (handler) {
    var self = this;
    self.controller[self.method].handler = handler;
    return self;
};
ControllerFactory.prototype.doneConfiguring = function () {
    var self = this;
    if (!self.addedToServer) {
        self.addedToServer = true;
    } else {
        throw new Error('already created controller, create new controller before registering with server again');
    }
    return self.controller;
};
ControllerFactory.prototype.newHandler = function (newCb) {
    var self = this;
    return function (request, reply) {
        var by = request.auth.credentials.user.email;
        var newObj = newCb ? newCb(request, by) : self.model.newObject(request, by);
        newObj.then(function (n) {
            if (!n) {
                reply(Boom.notFound(self.component + ' could not be created.'));
            } else {
                reply(n).code(201);
            }
        }).catch(function (err) {
            utils.logAndBoom(err, reply);
        });
    };
};
ControllerFactory.prototype.newController = function (validator, prereqs, uniqueCheck, newCb) {
    var self = this;
    var pre = _.flatten([PreReqs.ensurePermissions('update', self.component),
        {assign: 'isUnique', method: PreReqs.isUnique(self.model, uniqueCheck)},
        prereqs]);
    self.forMethod('new')
        .preProcessWith(pre)
        .handleUsing(self.newHandler(newCb));
    return self;
};
ControllerFactory.prototype.findHandler = function (queryBuilder, findCb) {
    var self = this;
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
        self.model._pagedFind(query, fields, sort, limit, page)
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
ControllerFactory.prototype.findController = function (validator, queryBuilder, findCb) {
    var self = this;
    validator.query.fields = Joi.string();
    validator.query.sort = Joi.string();
    validator.query.limit = Joi.number().default(20);
    validator.query.page = Joi.number().default(1);
    self.forMethod('find')
        .withValidation(validator)
        .preProcessWith(PreReqs.ensurePermissions('view', self.component))
        .handleUsing(self.findHandler(queryBuilder, findCb));
    return self;
};
ControllerFactory.prototype.findOneHandler = function (findOneCb) {
    var self = this;
    return function (request, reply) {
        var id = BaseModel.ObjectID(request.params.id);
        self.model._findOne({_id: id})
            .then(function (f) {
                if (!f) {
                    return Boom.notFound(self.component + ' (' + id.toString() + ' ) not found');
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
ControllerFactory.prototype.findOneController = function (findOneCb) {
    var self = this;
    self.forMethod('findOne')
        .preProcessWith(PreReqs.ensurePermissions('view', self.component))
        .handleUsing(self.findOneHandler(findOneCb));
    return self;
};
ControllerFactory.prototype.updateHandler = function (updateCb) {
    var self = this;
    return function (request, reply) {
        var id = BaseModel.ObjectID(request.params.id);
        self.model._findOne({_id: id})
            .then(function (f) {
                if (!f) {
                    return Boom.notFound(self.component + ' (' + id.toString() + ' ) not found');
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
ControllerFactory.prototype.updateController = function (validator, prereqs, methodName, updateCb) {
    var self = this;
    var perms = _.find(prereqs, function (prereq) {
        return prereq.assign === 'ensurePermissions';
    });
    var pre = _.flatten([perms ? [] : PreReqs.ensurePermissions('update', self.component), prereqs]);
    self.forMethod(methodName)
        .preProcessWith(pre)
        .handleUsing(self.updateHandler(updateCb));
    return self;
};
ControllerFactory.prototype.deleteController = function (pre) {
    var self = this;
    return self.updateController(undefined, pre ? pre : [], 'delete', 'del');
};
ControllerFactory.prototype.joinApproveRejectController = function (actions, toAdd, approvers) {
    var self = this;
    var validator = {
        payload: {}
    };
    validator.payload[toAdd] = Joi.array().items(Joi.string()).unique();
    self.updateController(validator, [
        PreReqs.ensurePermissions('view', self.component),
        {assign: 'validMembers', method: PreReqs.areValid(Users, 'email', toAdd)}
    ], actions[0], 'join');
    self.updateController(validator, [
        {assign: 'validAndPermitted', method: PreReqs.validAndPermitted(self.model, 'id', [approvers])},
        {assign: 'validMembers', method: PreReqs.areValid(Users, 'email', toAdd)}
    ], actions[1], 'approve');
    self.updateController(validator, [
        {assign: 'validAndPermitted', method: PreReqs.validAndPermitted(self.model, 'id', [approvers])},
        {assign: 'validMembers', method: PreReqs.areValid(Users, 'email', toAdd)}
    ], actions[2], 'reject');
    return self;
};

module.exports = ControllerFactory;

'use strict';
var Joi = require('joi');
var Boom = require('boom');
var Promise = require('bluebird');
var _ = require('lodash');
var ensurePermissions = require('./prereqs/ensure-permissions');
var validAndPermitted = require('./prereqs/valid-permitted');
var isUnique = require('./prereqs/is-unique');
var areValid = require('./prereqs/are-valid');
var prePopulate = require('./prereqs/pre-populate');
var utils = require('./utils');

var ControllerFactory = function ControllerFactory (component, model, notify) {
    var self = this;
    self.controller = {};
    self.component = component;
    self.model = model;
    self.notify = notify;
    return self;
};
ControllerFactory.prototype.forMethod = function forMethod (method) {
    var self = this;
    self.method = method;
    self.controller[self.method] = {
        pre: []
    };
    return self;
};
ControllerFactory.prototype.withValidation = function withValidation (validator) {
    var self = this;
    self.controller[self.method].validate = validator;
    return self;
};
ControllerFactory.prototype.preProcessWith = function preProcessWith (preProcess) {
    var self = this;
    if (_.isArray(preProcess)) {
        preProcess.forEach(function (pre) {
            self.controller[self.method].pre.push(pre);
        });
    } else {
        self.controller[self.method].pre.push(preProcess);
    }
    return self;
};
ControllerFactory.prototype.handleUsing = function handleUsing (handler) {
    var self = this;
    self.controller[self.method].handler = handler;
    return self;
};
ControllerFactory.prototype.doneConfiguring = function doneConfiguring () {
    var self = this;
    return self.controller;
};
ControllerFactory.prototype.newHandler = function createNewHandler (newCb) {
    var self = this;
    var newObjHook = function newObjCb (request, by) {
        return Promise.resolve(newCb ? newCb(request, by) : self.model.newObject(request, by));
    };
    return function createHandler (request, reply) {
        var by = request.auth.credentials ? request.auth.credentials.user.email : 'notloggedin';
        newObjHook(request, by)
            .then(function (n) {
                if (!n) {
                    reply(Boom.notFound(self.component + ' could not be created.'));
                } else {
                    if (self.notify) {
                        self.notify.emit('new ' + self.component, {object: n, request: request});
                    }
                    reply(n).code(201);
                }
            }).catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};
ControllerFactory.prototype.newController = function newController (validator, prereqs, uniqueCheck, newCb) {
    var self = this;
    var pre = _.flatten([ensurePermissions('update', self.component),
        isUnique(self.model, uniqueCheck),
        prereqs]);
    self.forMethod('new')
        .preProcessWith(pre)
        .handleUsing(self.newHandler(newCb));
    return self;
};
ControllerFactory.prototype.customNewController = function customNewController (method, validator, uniqueCheck, newCb) {
    var self = this;
    self.forMethod(method)
        .preProcessWith([isUnique(self.model, uniqueCheck)])
        .handleUsing(self.newHandler(newCb));
    return self;
};
ControllerFactory.prototype.findHandler = function createFindHandler (queryBuilder, findCb) {
    var self = this;
    var findHook = function findObjsCb(output) {
        return Promise.resolve(findCb ? findCb(output): output);
    };
    return function findHandler (request, reply) {
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
            .then(findHook)
            .then(reply)
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};
ControllerFactory.prototype.findController = function findController (validator, queryBuilder, findCb) {
    var self = this;
    validator.query.fields = Joi.string();
    validator.query.sort = Joi.string();
    validator.query.limit = Joi.number().default(20);
    validator.query.page = Joi.number().default(1);
    self.forMethod('find')
        .withValidation(validator)
        .preProcessWith(ensurePermissions('view', self.component))
        .handleUsing(self.findHandler(queryBuilder, findCb));
    return self;
};
ControllerFactory.prototype.findOneHandler = function createFindOneHandler (findOneCb) {
    var self = this;
    var findOneHook = function findOneCB(output) {
        return Promise.resolve(findOneCb ? findOneCb(output) : output);
    };
    return function findOneHandler (request, reply) {
        var f = request.pre[self.model._collection];
        findOneHook(f)
            .then(reply)
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};
ControllerFactory.prototype.findOneController = function findOneController (findOneCb) {
    var self = this;
    self.forMethod('findOne')
        .preProcessWith([ensurePermissions('view', self.component), prePopulate(self.model, 'id')])
        .handleUsing(self.findOneHandler(findOneCb));
    return self;
};
ControllerFactory.prototype.updateHandler = function createUpdateHandler (updateCb, methodName) {
    var self = this;
    var updateOneHook = function updateCB(u ,request, by) {
        u = _.isFunction(updateCb) ? updateCb(u, request, by) : u[updateCb](request, by);
        return u.save();
    };
    return function updateHandler (request, reply) {
        var u = request.pre[self.model._collection];
        var by = request.auth.credentials.user.email;
        updateOneHook(u, request, by)
            .then(function (u) {
                if (self.notify) {
                    self.notify.emit(methodName + ' ' + self.component, {object: u, request: request});
                }
                reply(u);
            })
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};
ControllerFactory.prototype.updateController = function updateController (validator, prereqs, methodName, updateCb) {
    var self = this;
    var perms = _.find(prereqs, function (prereq) {
        return prereq.assign === 'ensurePermissions';
    });
    var pre = _.flatten([perms ? [] : ensurePermissions('update', self.component), prereqs, prePopulate(self.model, 'id')]);
    self.forMethod(methodName)
        .preProcessWith(pre)
        .handleUsing(self.updateHandler(updateCb, methodName));
    return self;
};
ControllerFactory.prototype.deleteController = function deleteController (pre) {
    var self = this;
    return self.updateController(undefined, pre ? pre : [], 'delete', 'del');
};
ControllerFactory.prototype.joinApproveRejectController = function joinApproveRejectController (actions, toAdd, approvers) {
    var self = this;
    var validator = {
        payload: {}
    };
    validator.payload[toAdd] = Joi.array().items(Joi.string()).unique();
    self.updateController(validator,
        [
            ensurePermissions('view', self.component),
            areValid.users([toAdd])
        ],
        actions[0],
        'join');
    self.updateController(validator,
        [
            validAndPermitted(self.model, 'id', [approvers]),
            areValid.users([toAdd])
        ],
        actions[1],
        'approve');
    self.updateController(validator,
        [
            validAndPermitted(self.model, 'id', [approvers]),
            areValid.users([toAdd])
        ],
        actions[2],
        'reject');
    return self;
};

module.exports = ControllerFactory;

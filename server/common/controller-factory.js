'use strict';
var Joi = require('joi');
var _ = require('lodash');
var ensurePermissions = require('./prereqs/ensure-permissions');
var validAndPermitted = require('./prereqs/valid-permitted');
var isUnique = require('./prereqs/is-unique');
var areValid = require('./prereqs/are-valid');
var prePopulate = require('./prereqs/pre-populate');
var createNewHandler = require('./handlers/create');
var createFindHandler = require('./handlers/find');
var createFindOneHandler = require('./handlers/find-one');
var createUpdateHandler = require('./handlers/update');

var ControllerFactory = function ControllerFactory (model, notify) {
    var self = this;
    self.controller = {};
    if (model) {
        self.model = model;
        self.component = model._collection;
    }
    if (notify) {
        self.notify = notify;
    }
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
ControllerFactory.prototype.newController = function newController (validator, prereqs, uniqueCheck, newCb) {
    var self = this;
    var pre = _.flatten([ensurePermissions('update', self.component),
        isUnique(self.model, uniqueCheck),
        prereqs]);
    self.forMethod('new')
        .preProcessWith(pre)
        .handleUsing(createNewHandler(self.model, self.notify, newCb));
    return self;
};
ControllerFactory.prototype.customNewController = function customNewController (method, validator, uniqueCheck, newCb) {
    var self = this;
    self.forMethod(method)
        .preProcessWith([isUnique(self.model, uniqueCheck)])
        .handleUsing(createNewHandler(self.model, self.notify, newCb));
    return self;
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
        .handleUsing(createFindHandler(self.model, queryBuilder, findCb));
    return self;
};
ControllerFactory.prototype.findOneController = function findOneController (findOneCb) {
    var self = this;
    self.forMethod('findOne')
        .preProcessWith([ensurePermissions('view', self.component), prePopulate(self.model, 'id')])
        .handleUsing(createFindOneHandler(self.model, findOneCb));
    return self;
};
ControllerFactory.prototype.updateController = function updateController (validator, prereqs, methodName, updateCb) {
    var self = this;
    var perms = _.find(prereqs, function (prereq) {
        return prereq.assign === 'ensurePermissions';
    });
    var pre = _.flatten([perms ? [] : ensurePermissions('update', self.component), prereqs, prePopulate(self.model, 'id')]);
    self.forMethod(methodName)
        .preProcessWith(pre)
        .handleUsing(createUpdateHandler(self.model, self.notify, methodName, updateCb));
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

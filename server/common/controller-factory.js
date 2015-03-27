'use strict';
var Joi = require('joi');
var _ = require('lodash');
var EventEmitter = require('events');
var ensurePermissions = require('./prereqs/ensure-permissions');
var validAndPermitted = require('./prereqs/valid-permitted');
var isUnique = require('./prereqs/is-unique');
var areValid = require('./prereqs/are-valid');
var prePopulate = require('./prereqs/pre-populate');
var NewHandler = require('./handlers/create');
var FindHandler = require('./handlers/find');
var FindOneHandler = require('./handlers/find-one');
var UpdateHandler = require('./handlers/update');
var SendNotifications = require('./handlers/send-notifications');
var CancelNotifications = require('./handlers/cancel-notifications');
var JoinLeaveNotificationsBuilder = require('./notifications/join-leave-builder');
var CancelJoinNotificationsBuilder = require('./notifications/cancel-join-builder');
var ApproveNotificationsBuilder = require('./notifications/approve-builder');
var RejectNotificationsBuilder = require('./notifications/reject-builder');

var ControllerFactory = function ControllerFactory (model) {
    var self = this;
    self.controller = {};
    if (model) {
        self.model = model;
        self.component = model._collection;
    }
    return self;
};

ControllerFactory.prototype.enableNotifications = function enableNotifications () {
    var self = this;
    self.notify = true;
    return self;
};

ControllerFactory.prototype.forMethod = function forMethod (method) {
    var self = this;
    self.method = method;
    self.controller[self.method] = {
        pre: []
    };
    if (self.notify) {
        _.extend(self.controller[self.method], EventEmitter.prototype);
    }
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
        _.forEach(preProcess, function (pre) {
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

ControllerFactory.prototype.sendNotifications = function sendNotifications (notifyCb) {
    var self = this;
    self.controller[self.method].on('invoked', new SendNotifications(self.model, notifyCb));
    return self;
};

ControllerFactory.prototype.cancelNotifications = function cancelNotifications (cancelAction, cancelNotificationsCb) {
    var self = this;
    self.controller[self.method].on('invoked', new CancelNotifications(self.model, cancelAction, cancelNotificationsCb));
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
        .handleUsing(new NewHandler(self.model, self.controller.new, newCb));
    return self;
};

ControllerFactory.prototype.customNewController = function customNewController (method, validator, uniqueCheck, newCb) {
    var self = this;
    self.forMethod(method)
        .preProcessWith([isUnique(self.model, uniqueCheck)])
        .handleUsing(new NewHandler(self.model, self.controller[method], newCb));
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
        .handleUsing(new FindHandler(self.model, queryBuilder, findCb));
    return self;
};

ControllerFactory.prototype.findOneController = function findOneController (prereqs, findOneCb) {
    var self = this;
    var pre = _.filter(_.flatten([ensurePermissions('view', self.component), prePopulate(self.model, 'id'), prereqs]), function (f) {
        return !!f;
    });
    self.forMethod('findOne')
        .preProcessWith(pre)
        .handleUsing(new FindOneHandler(self.model, findOneCb));
    return self;
};

ControllerFactory.prototype.updateController = function updateController (validator, prereqs, methodName, updateCb) {
    var self = this;
    var perms = _.find(prereqs, function (prereq) {
        return prereq.assign === 'ensurePermissions';
    });
    var pre = _.flatten([perms ? [] : ensurePermissions('update', self.component), prePopulate(self.model, 'id'), prereqs]);
    self.forMethod(methodName)
        .preProcessWith(pre)
        .handleUsing(new UpdateHandler(self.model, self.controller[methodName], updateCb));
    return self;
};

ControllerFactory.prototype.deleteController = function deleteController (pre) {
    var self = this;
    return self.updateController(undefined, pre, 'delete', 'del');
};

ControllerFactory.prototype.joinLeaveController = function joinController (group, approvers, idForNotificationTitle) {
    var self = this;

    self.updateController(undefined, [
            ensurePermissions('view', self.component)
        ],
        'join',
        'join');
    self.sendNotifications(new JoinLeaveNotificationsBuilder(approvers, idForNotificationTitle, 'join', {
        public: '{{email}} has joined {{title}}',
        restricted: '{{email}} has joined {{title}} and needs your approval'
    }, {
        public: 'fyi',
        restricted: 'approve'
    }));

    self.updateController(undefined, [
            ensurePermissions('view', self.component),
            validAndPermitted(self.model, 'id', group)
        ],
        'leave',
        'leave');
    self.sendNotifications(new JoinLeaveNotificationsBuilder(approvers, idForNotificationTitle, 'leave', {
        public: '{{email}} has left {{title}}',
        restricted: '{{email}} has left {{title}}'
    }, {
        public: 'fyi',
        restricted: 'fyi'
    }));
    return self;
};

ControllerFactory.prototype.approveRejectController = function approveRejectController (toAdd, approvers, idForNotificationsTitle) {
    var self = this;
    var validator = {
        payload: {}
    };
    validator.payload[toAdd] = Joi.array().items(Joi.string()).unique();

    self.updateController(validator, [
            validAndPermitted(self.model, 'id', [approvers]),
            areValid.users([toAdd])
        ],
        'approve',
        'approve');
    self.sendNotifications(new ApproveNotificationsBuilder(toAdd, approvers, idForNotificationsTitle));
    self.cancelNotifications('approve', new CancelJoinNotificationsBuilder(toAdd));

    self.updateController(validator, [
            validAndPermitted(self.model, 'id', [approvers]),
            areValid.users([toAdd])
        ],
        'reject',
        'reject');
    self.sendNotifications(new RejectNotificationsBuilder(toAdd, idForNotificationsTitle));
    self.cancelNotifications('approve', new CancelJoinNotificationsBuilder(toAdd));

    return self;
};

module.exports = ControllerFactory;

'use strict';
let Joi = require('joi');
let _ = require('lodash');
let EventEmitter = require('events');
let ensurePermissions = require('./prereqs/ensure-permissions');
let isMemberOf = require('./prereqs/is-member-of');
let isUnique = require('./prereqs/is-unique');
let areValid = require('./prereqs/are-valid');
let prePopulate = require('./prereqs/pre-populate');
let NewHandler = require('./handlers/create');
let FindHandler = require('./handlers/find');
let FindOneHandler = require('./handlers/find-one');
let UpdateHandler = require('./handlers/update');
let SendNotifications = require('./handlers/send-notifications');
let CancelNotifications = require('./handlers/cancel-notifications');
let JoinLeaveNotificationsBuilder = require('./notifications/join-leave-builder');
let CancelJoinNotificationsBuilder = require('./notifications/cancel-join-builder');
let ApproveNotificationsBuilder = require('./notifications/approve-builder');
let RejectNotificationsBuilder = require('./notifications/reject-builder');
var ControllerFactory = function ControllerFactory (model) {
    let self = this;
    self.controller = {};
    if (model) {
        self.model = model;
        self.component = model.collection;
    }
    return self;
};
ControllerFactory.prototype.enableNotifications = function enableNotifications () {
    let self = this;
    self.notify = true;
    return self;
};
ControllerFactory.prototype.forMethod = function forMethod (method) {
    let self = this;
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
    let self = this;
    self.controller[self.method].validate = validator;
    return self;
};
ControllerFactory.prototype.preProcessWith = function preProcessWith (preProcess) {
    let self = this;
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
    let self = this;
    self.controller[self.method].handler = handler;
    return self;
};
ControllerFactory.prototype.sendNotifications = function sendNotifications (notifyCb) {
    let self = this;
    self.controller[self.method].on('invoked', new SendNotifications(self.model, notifyCb));
    return self;
};
ControllerFactory.prototype.cancelNotifications = function cancelNotifications (cancelAction, cancelNotificationsCb) {
    let self = this;
    self.controller[self.method].on('invoked', new CancelNotifications(self.model, cancelAction, cancelNotificationsCb));
    return self;
};
ControllerFactory.prototype.doneConfiguring = function doneConfiguring () {
    let self = this;
    return self.controller;
};
ControllerFactory.prototype.newController = function newController (validator, prereqs, uniqueCheck, newCb) {
    let self = this;
    var pre = _.flatten([ensurePermissions('update', self.component),
        isUnique(self.model, uniqueCheck),
        prereqs]);
    self.forMethod('new')
        .preProcessWith(pre)
        .handleUsing(new NewHandler(self.model, self.controller.new, newCb));
    return self;
};
ControllerFactory.prototype.customNewController = function customNewController (method, validator, uniqueCheck, newCb) {
    let self = this;
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
    let self = this;
    let pre = _.filter(_.flatten([ensurePermissions('view', self.component), prePopulate(self.model, 'id'), prereqs]),
        function (f) {
            return !!f;
        });
    self.forMethod('findOne')
        .preProcessWith(pre)
        .handleUsing(new FindOneHandler(self.model, findOneCb));
    return self;
};
ControllerFactory.prototype.updateController = function updateController (validator, prereqs, methodName, updateCb) {
    let self = this;
    let perms = _.find(prereqs, function (prereq) {
        return prereq.assign === 'ensurePermissions';
    });
    let pre = _.flatten([perms ? [] : ensurePermissions('update', self.component), prePopulate(self.model, 'id'), prereqs]);
    self.forMethod(methodName)
        .preProcessWith(pre)
        .handleUsing(new UpdateHandler(self.model, self.controller[methodName], updateCb));
    return self;
};
ControllerFactory.prototype.deleteController = function deleteController (pre) {
    let self = this;
    return self.updateController(undefined, pre, 'delete', 'del');
};
ControllerFactory.prototype.joinLeaveController = function joinController (group, approvers, idForNotificationTitle) {
    let self = this;
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
            isMemberOf(self.model, group)
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
    let self = this;
    let validator = {
        payload: {}
    };
    validator.payload[toAdd] = Joi.array().items(Joi.string()).unique();
    _.forEach(['approve', 'reject'], function (action) {
        self.updateController(validator, [
                isMemberOf(self.model, [approvers]),
                areValid.users([toAdd])
            ],
            action,
            action);
        self.sendNotifications(action === 'approve' ?
            new ApproveNotificationsBuilder(toAdd, approvers, idForNotificationsTitle) :
            new RejectNotificationsBuilder(toAdd, idForNotificationsTitle));
        self.cancelNotifications('approve', new CancelJoinNotificationsBuilder(toAdd));
    });
    return self;
};
module.exports = ControllerFactory;

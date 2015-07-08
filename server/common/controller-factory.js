'use strict';
let Joi = require('joi');
let _ = require('lodash');
let EventEmitter = require('events');
let ensurePermissions = require('./prereqs/ensure-permissions');
let isMemberOf = require('./prereqs/is-member-of');
let isUnique = require('./prereqs/is-unique');
let areValid = require('./prereqs/are-valid');
let prePopulate = require('./prereqs/pre-populate');
let newHandler = require('./handlers/create');
let findHandler = require('./handlers/find');
let findOneHandler = require('./handlers/find-one');
let updateHandler = require('./handlers/update');
let sendNotifications = require('./handlers/send-notifications');
let cancelNotifications = require('./handlers/cancel-notifications');
let joinLeaveNotificationsBuilder = require('./notifications/join-leave-builder');
let cancelJoinNotificationsBuilder = require('./notifications/cancel-join-builder');
let approveNotificationsBuilder = require('./notifications/approve-builder');
let rejectNotificationsBuilder = require('./notifications/reject-builder');
let ControllerFactory = function ControllerFactory (model) {
    let self = this;
    self.controller = {};
    if (model) {
        self.model = model;
        self.component = model.collection;
    }
    return self;
};
ControllerFactory.prototype.enableNotifications = () => {
    let self = this;
    self.notify = true;
    return self;
};
ControllerFactory.prototype.forMethod = (method) => {
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
ControllerFactory.prototype.withValidation = (validator) => {
    let self = this;
    self.controller[self.method].validate = validator;
    return self;
};
ControllerFactory.prototype.preProcessWith = (preProcess) => {
    let self = this;
    if (_.isArray(preProcess)) {
        _.forEach(preProcess, (pre) => {
            self.controller[self.method].pre.push(pre);
        });
    } else {
        self.controller[self.method].pre.push(preProcess);
    }
    return self;
};
ControllerFactory.prototype.handleUsing = (handler) => {
    let self = this;
    self.controller[self.method].handler = handler;
    return self;
};
ControllerFactory.prototype.sendNotifications = (notifyCb) => {
    let self = this;
    self.controller[self.method].on('invoked', sendNotifications(self.model, notifyCb));
    return self;
};
ControllerFactory.prototype.cancelNotifications = (cancelAction, cancelNotificationsCb) => {
    let self = this;
    self.controller[self.method].on('invoked', cancelNotifications(self.model, cancelAction, cancelNotificationsCb));
    return self;
};
ControllerFactory.prototype.doneConfiguring = () => {
    let self = this;
    return self.controller;
};
ControllerFactory.prototype.newController = (validator, prereqs, uniqueCheck, newCb) => {
    let self = this;
    let pre = _.flatten([ensurePermissions('update', self.component),
        isUnique(self.model, uniqueCheck),
        prereqs]);
    self.forMethod('new')
        .preProcessWith(pre)
        .handleUsing(newHandler(self.model, self.controller.new, newCb));
    return self;
};
ControllerFactory.prototype.customNewController = (method, validator, uniqueCheck, newCb) => {
    let self = this;
    self.forMethod(method)
        .preProcessWith([isUnique(self.model, uniqueCheck)])
        .handleUsing(newHandler(self.model, self.controller[method], newCb));
    return self;
};
ControllerFactory.prototype.findController = (validator, queryBuilder, findCb) => {
    let self = this;
    validator.query.fields = Joi.string();
    validator.query.sort = Joi.string();
    validator.query.limit = Joi.number().default(20);
    validator.query.page = Joi.number().default(1);
    self.forMethod('find')
        .withValidation(validator)
        .preProcessWith(ensurePermissions('view', self.component))
        .handleUsing(findHandler(self.model, queryBuilder, findCb));
    return self;
};
ControllerFactory.prototype.findOneController = (prereqs, findOneCb) => {
    let self = this;
    let pre = _.filter(_.flatten([ensurePermissions('view', self.component), prePopulate(self.model, 'id'), prereqs]),
        (f) => !!f);
    self.forMethod('findOne')
        .preProcessWith(pre)
        .handleUsing(findOneHandler(self.model, findOneCb));
    return self;
};
ControllerFactory.prototype.updateController = (validator, prereqs, methodName, updateCb) => {
    let self = this;
    let perms = _.find(prereqs, (prereq) => prereq.assign === 'ensurePermissions');
    let pre = _.flatten([perms ? [] : ensurePermissions('update', self.component), prePopulate(self.model, 'id'), prereqs]);
    self.forMethod(methodName)
        .preProcessWith(pre)
        .handleUsing(updateHandler(self.model, self.controller[methodName], updateCb));
    return self;
};
ControllerFactory.prototype.deleteController = (pre) => {
    let self = this;
    return self.updateController(undefined, pre, 'delete', 'del');
};
ControllerFactory.prototype.joinLeaveController = (group, approvers, idForNotificationTitle) => {
    let self = this;
    self.updateController(undefined, [
            ensurePermissions('view', self.component)
        ],
        'join',
        'join');
    self.sendNotifications(joinLeaveNotificationsBuilder(approvers, idForNotificationTitle, 'join', {
        'public': '{{email}} has joined {{title}}',
        restricted: '{{email}} has joined {{title}} and needs your approval'
    }, {
        'public': 'fyi',
        restricted: 'approve'
    }));
    self.updateController(undefined, [
            ensurePermissions('view', self.component),
            isMemberOf(self.model, group)
        ],
        'leave',
        'leave');
    self.sendNotifications(joinLeaveNotificationsBuilder(approvers, idForNotificationTitle, 'leave', {
        'public': '{{email}} has left {{title}}',
        restricted: '{{email}} has left {{title}}'
    }, {
        'public': 'fyi',
        restricted: 'fyi'
    }));
    return self;
};
ControllerFactory.prototype.approveRejectController = (toAdd, approvers, idForNotificationsTitle) => {
    let self = this;
    let validator = {
        payload: {}
    };
    validator.payload[toAdd] = Joi.array().items(Joi.string()).unique();
    _.forEach(['approve', 'reject'], (action) => {
        self.updateController(validator, [
                isMemberOf(self.model, [approvers]),
                areValid.users([toAdd])
            ],
            action,
            action);
        self.sendNotifications(action === 'approve' ?
            approveNotificationsBuilder(toAdd, approvers, idForNotificationsTitle) :
            rejectNotificationsBuilder(toAdd, idForNotificationsTitle));
        self.cancelNotifications('approve', cancelJoinNotificationsBuilder(toAdd));
    });
    return self;
};
module.exports = ControllerFactory;

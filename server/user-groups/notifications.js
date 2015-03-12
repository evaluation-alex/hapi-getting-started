'use strict';
var _ = require('lodash');
var Notifications = require('./../users/notifications/model');
var logger = require('./../../config').logger;

Notifications.on('new user-groups', function (obj) {
    var ug = obj.object;
    var request = obj.request;
    //email, organisation, objectType, objectId, title, state, action, priority, content, by
    Notifications.create(ug.owners,
        ug.organisation,
        'UserGroups',
        ug._id,
        ['UserGroup {{name}} created.', {name: ug.name}],
        'unread',
        'fyi',
        'low',
        ['UserGroup {{name}} created and you have been designated owner by {{createdBy}}',
            {name: ug.name, createdBy: ug.createdBy}],
        request.auth.credentials.user.email)
        .catch(function (err) {
            if (err) {
                logger.error({error: err});
            }
        });

});

Notifications.on('delete user-groups', function (obj) {
    var ug = obj.object;
    var request = obj.request;
    //email, organisation, objectType, objectId, title, state, action, priority, content, by
    Notifications.create(ug.owners,
        ug.organisation,
        'UserGroups',
        ug._id,
        ['UserGroup {{name}} deleted.', {name: ug.name}],
        'unread',
        'fyi',
        'low',
        ['UserGroup {{name}} deleted by {{updatedBy}}', {name: ug.name, updatedBy: ug.updatedBy}],
        request.auth.credentials.user.email)
        .catch(function (err) {
            if (err) {
                logger.error({error: err});
            }
        });

});

Notifications.on('update user-groups', function (obj) {
    var ug = obj.object;
    var request = obj.request;
    var description = {};
    var shouldNotify = false;
    _.forEach(['owners', 'members'], function (toInspect) {
        _.forEach(['added', 'removed'], function (t) {
            var p = t + _.capitalize(toInspect);
            if (request.payload[p] && request.payload[p].length > 0) {
                shouldNotify = true;
                description[toInspect] = description[toInspect] || {};
                description[toInspect][t] = request.payload[p];
            }
        });
    });
    //email, organisation, objectType, objectId, title, state, action, priority, content, by
    if (shouldNotify) {
        Notifications.create(ug.owners,
            ug.organisation,
            'UserGroups',
            ug._id,
            ['UserGroup {{name}} updated by {{updatedBy}}', {name: ug.name, updatedBy: ug.updatedBy}],
            'unread',
            'fyi',
            'low',
            description,
            request.auth.credentials.user.email)
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            });

    }
});

Notifications.on('join user-groups', function (obj) {
    var ug = obj.object;
    var request = obj.request;
    if (request.payload.addedMembers && request.payload.addedMembers.length > 0) {
        var priority = 'low';
        var action = 'fyi';
        var description = {members: {added: request.payload.addedMembers}};
        if (ug.access === 'restricted') {
            priority = 'medium';
            action = 'approve';
        }
        //email, organisation, objectType, objectId, title, state, action, priority, content, by
        Notifications.create(ug.owners,
            ug.organisation,
            'UserGroups',
            ug._id,
            ['{{name}} has new subscribers that need approval', {name: ug.name}],
            'unread',
            action,
            priority,
            description,
            request.auth.credentials.user.email)
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            });

    }
});

Notifications.on('approve user-groups', function (obj) {
    var ug = obj.object;
    var request = obj.request;
    if (request.payload.addedMembers && request.payload.addedMembers.length > 0) {
        var priority = 'low';
        var action = 'fyi';
        var description = {members: {approved: request.payload.addedMembers}};
        //email, organisation, objectType, objectId, title, state, action, priority, content, by
        Notifications.create(ug.owners,
            ug.organisation,
            'UserGroups',
            ug._id,
            ['{{name}} has new approved subscribers', {name: ug.name}],
            'unread',
            action,
            priority,
            description,
            request.auth.credentials.user.email)
            .then(function () {
                return Notifications._find({
                    objectType: 'UserGroups',
                    objectId: ug._id,
                    state: 'unread',
                    action: 'approve'
                });
            })
            .then(function (notifications) {
                return _.map(notifications, function (notification) {
                    _.remove(notification.description.members.added, request.payload.addedMembers);
                    if (notification.description.members.added.length === 0) {
                        notification.setState('cancelled', request.auth.credentials.user.email);
                    }
                    return notification.save();
                });
            })
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            });
    }
});

Notifications.on('reject user-groups', function (obj) {
    var ug = obj.object;
    var request = obj.request;
    if (request.payload.addedMembers && request.payload.addedMembers.length > 0) {
        Notifications._find({
            objectType: 'UserGroups',
            objectId: ug._id,
            state: 'unread',
            action: 'approve'
        })
            .then(function (notifications) {
                return _.map(notifications, function (notification) {
                    _.remove(notification.description.members.added, request.payload.addedMembers);
                    if (notification.description.members.added.length === 0) {
                        notification.setState('cancelled', request.auth.credentials.user.email);
                    }
                    return notification.save();
                });
            })
            .catch(function (err) {
                if (err) {
                    logger.error({error: err});
                }
            });

    }
});

module.exports = Notifications;

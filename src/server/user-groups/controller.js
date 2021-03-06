'use strict';
const _ = require('./../lodash');
const utils = require('./../common/utils');
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const post = require('./../common/posthandlers');
const {upperFirst} = _;
const {by, org, hasItems} = utils;
const {canUpdate, canView, areValidUsers, isMemberOf, uniqueCheck, prePopulate, buildMongoQuery} = pre;
const {buildCreateHandler, buildFindHandler, buildFindOneHandler, buildUpdateHandler} = handlers;
const {sendNotifications, cancelNotifications, hashCodeOn} = post;
const UserGroups = require('./model');
const schema = require('./../../shared/rest-api')(require('joi'), _)['user-groups'];
module.exports = {
    new: {
        validate: schema.create,
        pre: [
            canUpdate(UserGroups.collection),
            uniqueCheck(UserGroups, request => {
                return {
                    name: request.payload.name,
                    organisation: org(request)
                };
            }),
            areValidUsers(['owners', 'members'])
        ],
        handler: buildCreateHandler(UserGroups),
        post: [
            sendNotifications(UserGroups, (ug, request) => {
                const title = ug.name;
                const createdBy = by(request);
                return {
                    to: ug.owners,
                    title: ['UserGroup {{title}} created.', {title}],
                    description: ['UserGroup {{title}} created and you have been designated owner by {{createdBy}}', {
                        title,
                        createdBy
                    }]
                };
            }),
            hashCodeOn(UserGroups)
        ]
    },
    find: {
        validate: schema.find,
        pre: [
            canView(UserGroups.collection),
            buildMongoQuery(UserGroups, schema.findOptions)
        ],
        handler: buildFindHandler(UserGroups),
        post: [
            hashCodeOn(UserGroups)
        ]
    },
    findOne: {
        validate: schema.findOne,
        pre: [
            canView(UserGroups.collection),
            prePopulate(UserGroups, 'id')
        ],
        handler: buildFindOneHandler(UserGroups),
        post: [
            hashCodeOn(UserGroups)
        ]
    },
    update: {
        validate: schema.update,
        pre: [
            canUpdate(UserGroups.collection),
            prePopulate(UserGroups, 'id'),
            areValidUsers(['addedOwners', 'addedMembers']),
            isMemberOf(UserGroups, ['owners'])
        ],
        handler: buildUpdateHandler(UserGroups, 'update'),
        post: [
            sendNotifications(UserGroups, (ug, request) => {
                const description = {};
                let shouldNotify = false;
                ['owners', 'members'].forEach(toInspect => {
                    ['added', 'removed'].forEach(t => {
                        const p = t + upperFirst(toInspect);
                        if (hasItems(request.payload[p])) {
                            shouldNotify = true;
                            description[toInspect] = description[toInspect] || {};
                            description[toInspect][t] = request.payload[p];
                        }
                    });
                });
                const title = ug.name;
                const updatedBy = by(request);
                return {
                    to: shouldNotify ? ug.owners : [],
                    title: ['UserGroup {{title}} updated by {{updatedBy}}', {title, updatedBy}],
                    description: description
                };
            }),
            hashCodeOn(UserGroups)
        ]
    },
    delete: {
        validate: schema.delete,
        pre: [
            canUpdate(UserGroups.collection),
            prePopulate(UserGroups, 'id'),
            isMemberOf(UserGroups, ['owners'])
        ],
        handler: buildUpdateHandler(UserGroups, 'del'),
        post: [
            sendNotifications(UserGroups, (ug, request) => {
                const title = ug.name;
                const createdBy = by(request);
                return {
                    to: ug.owners,
                    title: ['UserGroup {{title}} deleted.', {title}],
                    description: ['UserGroup {{title}} deleted by {{updatedBy}}', {title, createdBy}]
                };
            }),
            hashCodeOn(UserGroups)
        ]
    },
    join: {
        validate: schema.join,
        pre: [
            canView(UserGroups.collection),
            prePopulate(UserGroups, 'id')
        ],
        handler: buildUpdateHandler(UserGroups, 'join'),
        post: [
            sendNotifications(UserGroups, (ug, request) => {
                const title = ug.name;
                const email = by(request);
                const utitle = ug.access === 'public' ? '{{email}} has joined {{title}}' : '{{email}} has joined {{title}} and needs your approval';
                return {
                    to: ug.owners,
                    description: {join: email},
                    title: [utitle, {title, email}],
                    action: ug.access === 'public' ? 'fyi' : 'approve',
                    priority: ug.access === 'restricted' ? 'medium' : 'low'
                };
            }),
            hashCodeOn(UserGroups)
        ]
    },
    leave: {
        validate: schema.leave,
        pre: [
            canView(UserGroups.collection),
            prePopulate(UserGroups, 'id'),
            isMemberOf(UserGroups, ['members'])
        ],
        handler: buildUpdateHandler(UserGroups, 'leave'),
        post: [
            sendNotifications(UserGroups, (ug, request) => {
                const title = ug.name;
                const email = by(request);
                return {
                    to: ug.owners,
                    description: {leave: email},
                    title: ['{{email}} has left {{title}}', {title, email}],
                    action: 'fyi',
                    priority: 'low'
                };
            }),
            hashCodeOn(UserGroups)
        ]
    },
    approve: {
        validate: schema.approve,
        pre: [
            canUpdate(UserGroups.collection),
            prePopulate(UserGroups, 'id'),
            isMemberOf(UserGroups, ['owners']),
            areValidUsers(['addedMembers'])
        ],
        handler: buildUpdateHandler(UserGroups, 'approve'),
        post: [
            sendNotifications(UserGroups, (ug, request) => {
                const title = ug.name;
                const hasAddedMembers = hasItems(request.payload.addedMembers);
                return {
                    to: hasAddedMembers ? ug.owners : [],
                    title: ['{{title}} has new approved members', {title}],
                    description: hasAddedMembers ? {approved: request.payload.addedMembers} : {},
                    priority: 'medium'
                };
            }),
            cancelNotifications(UserGroups, 'approve', (ug, request, notification) => {
                let modified = false;
                const updatedBy = by(request);
                request.payload.addedMembers.forEach(a => {
                    if (notification.content.join === a) {
                        modified = true;
                        notification.setState('cancelled', updatedBy);
                    }
                });
                return modified ? notification.save() : notification;
            }),
            hashCodeOn(UserGroups)
        ]
    },
    reject: {
        validate: schema.approve,
        pre: [
            canUpdate(UserGroups.collection),
            prePopulate(UserGroups, 'id'),
            isMemberOf(UserGroups, ['owners']),
            areValidUsers(['addedMembers'])
        ],
        handler: buildUpdateHandler(UserGroups, 'reject'),
        post: [
            sendNotifications(UserGroups, (ug, request) => {
                const title = ug.name;
                const updatedBy = by(request);
                const hasAddedMembers = hasItems(request.payload.addedMembers);
                return {
                    to: hasAddedMembers ? request.payload.addedMembers : [],
                    title: ['Your request to join {{title}} was denied', {title}],
                    description: ['Your request to join {{title}} was denied by {{updatedBy}}', {title, updatedBy}]
                };
            }),
            cancelNotifications(UserGroups, 'approve', (ug, request, notification) => {
                const updatedBy = by(request);
                request.payload.addedMembers.forEach(a => {
                    /*istanbul ignore else*/
                    if (notification.content.join === a) {
                        notification.setState('cancelled', updatedBy);
                    }
                });
                return notification.save();
            }),
            hashCodeOn(UserGroups)
        ]
    }
};

'use strict';
const moment = require('moment');
const utils = require('./../common/utils');
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const post = require('./../common/posthandlers');
const {by} = utils;
const { canUpdate, areValidPosts, onlyOwner, uniqueCheck, prePopulate } = pre;
const {buildCreateHandler, buildUpdateHandler} = handlers;
const {hashCodeOn, populateObject} = post;
const schema = require('./../../shared/rest-api')(require('joi'), require('./../lodash'))['posts-comments'];
const Comments = require('./model');
module.exports = {
    new: {
        validate: schema.create,
        pre: [
            canUpdate(Comments.collection),
            uniqueCheck(Comments, request => {
                return {
                    postId: request.payload.postId,
                    email: by(request),
                    createdOn: {$gte: moment().subtract(60, 'seconds').toDate()}
                };
            }),
            areValidPosts(['postId'])
        ],
        handler: buildCreateHandler(Comments),
        post: [
            populateObject(Comments),
            hashCodeOn(Comments)
        ]
    },
    update: {
        validate: schema.update,
        pre: [
            canUpdate(Comments.collection),
            prePopulate(Comments, 'id'),
            onlyOwner(Comments)
        ],
        handler: buildUpdateHandler(Comments, 'update'),
        post: [
            populateObject(Comments),
            hashCodeOn(Comments)
        ]
    },
    delete: {
        validate: schema.delete,
        pre: [
            canUpdate(Comments.collection),
            prePopulate(Comments, 'id'),
            onlyOwner(Comments)
        ],
        handler: buildUpdateHandler(Comments, 'del'),
        post: [
            populateObject(Comments),
            hashCodeOn(Comments)
        ]
    },
    approve: {
        validate: schema.approve,
        pre: [
            canUpdate(Comments.collection),
            prePopulate(Comments, 'id')
        ],
        handler: buildUpdateHandler(Comments, 'approve'),
        post: [
            populateObject(Comments),
            hashCodeOn(Comments)
        ]
    },
    spam: {
        validate: schema.spam,
        pre: [
            canUpdate(Comments.collection),
            prePopulate(Comments, 'id')
        ],
        handler: buildUpdateHandler(Comments, 'spam'),
        post: [
            populateObject(Comments),
            hashCodeOn(Comments)
        ]
    }
};

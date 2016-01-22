'use strict';
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const post = require('./../common/posthandlers');
const {canUpdate, prePopulate, onlyOwner} = pre;
const {buildUpdateHandler} = handlers;
const {hashCodeOn} = post;
const Users = require('./../users/model');
const schemas = require('./schemas');
module.exports = {
    update: {
        validate: schemas.controller.update,
        pre: [
            canUpdate(Users.collection),
            prePopulate(Users, 'id'),
            onlyOwner(Users)
        ],
        handler: buildUpdateHandler(Users, schemas.dao.updateMethod.method),
        post: [
            hashCodeOn(Users)
        ]
    }
};

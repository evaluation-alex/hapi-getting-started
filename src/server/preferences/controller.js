'use strict';
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const post = require('./../common/posthandlers');
const {canUpdate, prePopulate, onlyOwner} = pre;
const {buildUpdateHandler} = handlers;
const {hashCodeOn} = post;
const Users = require('./../users/model');
const schema = require('./../../shared/rest-api')(require('joi'), require('./../lodash')).preferences;
module.exports = {
    update: {
        validate: schema.update,
        pre: [
            canUpdate(Users.collection),
            prePopulate(Users, 'id'),
            onlyOwner(Users)
        ],
        handler: buildUpdateHandler(Users, 'updatePreferences'),
        post: [
            hashCodeOn(Users)
        ]
    }
};

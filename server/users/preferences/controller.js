'use strict';
const pre = require('./../../common/prereqs');
const handlers = require('./../../common/handlers');
const {canUpdate, prePopulate, onlyOwner} = pre;
const {buildUpdateHandler} = handlers;
const Users = require('./../model');
const schemas = require('./schemas');
module.exports = {
    update: {
        validate: schemas.controller.update,
        pre: [
            canUpdate(Users.collection),
            prePopulate(Users, 'id'),
            onlyOwner(Users)
        ],
        handler: buildUpdateHandler(Users, schemas.dao.updateMethod.method)
    }
};

'use strict';
const {canUpdate, prePopulate, onlyOwner} = require('./../../common/prereqs');
const {buildUpdateHandler} = require('./../../common/handlers');
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

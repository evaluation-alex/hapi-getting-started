'use strict';
const {canView, findValidator} = require('./../common/prereqs');
const {buildFindHandler} = require('./../common/handlers');
const schemas = require('./schemas');
const Audit = require('./model');
module.exports = {
    find: {
        validate: findValidator(schemas.controller.find),
        pre: [
            canView(Audit.collection)
        ],
        handler: buildFindHandler(Audit, schemas.controller.findOptions)
    }
};

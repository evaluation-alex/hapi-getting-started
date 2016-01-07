'use strict';
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const {canView, findValidator} = pre;
const {buildFindHandler} = handlers;
const schemas = require('./schemas');
const Audit = require('./model');
module.exports = {
    find: {
        validate: findValidator(schemas.controller.find, schemas.controller.findDefaults),
        pre: [
            canView(Audit.collection)
        ],
        handler: buildFindHandler(Audit, schemas.controller.findOptions)
    }
};

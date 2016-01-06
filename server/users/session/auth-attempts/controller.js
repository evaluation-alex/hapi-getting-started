'use strict';
const {merge} = require('lodash');
const {buildQuery} = require('./../../../common/utils');
const {canView, findValidator} = require('./../../../common/prereqs');
const {buildFindHandler} = require('./../../../common/handlers');
const schemas = require('./schemas');
const AuthAttempts = require('./model');
module.exports = {
    find: {
        validate: findValidator(schemas.controller.find, schemas.controller.findDefaults),
        pre: [
            canView(AuthAttempts.collection)
        ],
        handler: buildFindHandler(AuthAttempts, request => merge({organisation: '*'}, buildQuery(request, schemas.controller.findOptions)))
    }
};

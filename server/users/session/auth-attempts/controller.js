'use strict';
const _ = require('lodash');
const utils = require('./../../../common/utils');
const pre = require('./../../../common/prereqs');
const handlers = require('./../../../common/handlers');
const {merge} = _;
const {buildQuery} = utils;
const {canView, findValidator} = pre;
const {buildFindHandler} = handlers;
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

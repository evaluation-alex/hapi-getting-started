'use strict';
const _ = require('./../lodash');
const utils = require('./../common/utils');
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const {merge} = _;
const {buildQuery} = utils;
const {canView, findValidator, buildMongoQuery} = pre;
const {buildFindHandler} = handlers;
const schemas = require('./schemas');
const AuthAttempts = require('./model');
module.exports = {
    find: {
        validate: findValidator(schemas.controller.find, schemas.controller.findDefaults),
        pre: [
            canView(AuthAttempts.collection),
            buildMongoQuery(AuthAttempts, schemas.controller.findOptions, (request, findOptions) => {
                return merge({organisation: '*'}, buildQuery(request, findOptions))
            })
        ],
        handler: buildFindHandler(AuthAttempts)
    }
};

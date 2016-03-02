'use strict';
const _ = require('./../lodash');
const utils = require('./../common/utils');
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const {merge} = _;
const {buildQuery} = utils;
const {canView, buildMongoQuery} = pre;
const {buildFindHandler} = handlers;
const schema = require('./../../shared/rest-api')(require('joi'), require('./../lodash'))['auth-attempts'];
const AuthAttempts = require('./model');
module.exports = {
    find: {
        validate: schema.find,
        pre: [
            canView(AuthAttempts.collection),
            buildMongoQuery(AuthAttempts, schema.findOptions, (request, findOptions) =>
                merge({organisation: '*'}, buildQuery(request, findOptions))
            )
        ],
        handler: buildFindHandler(AuthAttempts)
    }
};

'use strict';
const pre = require('./../common/prereqs');
const handlers = require('./../common/handlers');
const {canView, buildMongoQuery} = pre;
const {buildFindHandler} = handlers;
const schema = require('./../../shared/rest-api')(require('joi'), require('./../lodash')).audit;
const Audit = require('./model');
module.exports = {
    find: {
        validate: schema.find,
        pre: [
            canView(Audit.collection),
            buildMongoQuery(Audit, schema.findOptions)
        ],
        handler: buildFindHandler(Audit)
    }
};

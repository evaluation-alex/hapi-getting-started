'use strict';
const _ = require('./../lodash');
const Bluebird = require('bluebird');
const utils = require('./utils');
const config = require('./../config');
const {enableConsole} = config;
const {isFunction, omit} = _;
const {org, by, logAndBoom, optsToDoc, profile} = utils;
const buildCreateHandler = function buildCreateHandler(Model) {
    const timing = profile('handler', {collection: Model.collection, method: 'create', type: 'main'});
    return function createHandler(request, reply) {
        const start = Date.now();
        Model.newObject(request, by(request), org(request))
            .catch(logAndBoom)
            .then(reply)
            .finally(() => timing(start));
    };
};
const buildFindHandler = function buildFindHandler(Model) {
    const timing = profile('handler', {collection: Model.collection, method: 'find', type: 'main'});
    return function findHandler(request, reply) {
        const start = Date.now();
        const {fields, sort, limit, page} = request.payload.pagination || {};
        const query = request.pre.mongoQuery;
        /*istanbul ignore if*//*istanbul ignore else*/
        if (enableConsole) {
            console.log('+-+-+-+-+-+-+-+-+-+-+-+-+-+-+');
            console.log('collection:', Model.collection);
            console.log('query.and :', omit(query, ['$or']));
            console.log('query.or  :', query.$or);
            console.log('sort      :', sort);
            console.log('limit     :', limit);
            console.log('page      :', page);
            console.log('fields    :', fields);
            console.log('+-+-+-+-+-+-+-+-+-+-+-+-+-+-+');
        }
        Model.pagedFind(query, optsToDoc(fields, 1, 0), optsToDoc(sort, 1, -1), limit, page)
            .catch(logAndBoom)
            .then(reply)
            .finally(() => timing(start));
    };
};
const buildFindOneHandler = function buildFindOneHandler({collection}) {
    const timing = profile('handler', {collection, method: 'findOne', type: 'main'});
    return function findOneHandler(request, reply) {
        const start = Date.now();
        Bluebird.resolve(request.pre[collection])
            .catch(logAndBoom)
            .then(reply)
            .finally(() => timing(start));
    };
};
const buildUpdateHandler = function buildUpdateHandler({collection}, updateCb) {
    const timing = profile('handler', {collection, method: 'update', type: 'main'});
    const update = Bluebird.method((u, request, by) =>
        isFunction(updateCb) ?
            updateCb(u, request, by) :
            u[updateCb](request, by)
    );
    return function updateHandler(request, reply) {
        const start = Date.now();
        const toUpdate = request.pre[collection];
        update(toUpdate, request, by(request))
            .then(u => u.save())
            .catch(logAndBoom)
            .then(reply)
            .finally(() => timing(start));
    };
};
module.exports = {
    buildCreateHandler,
    buildFindHandler,
    buildFindOneHandler,
    buildUpdateHandler
};

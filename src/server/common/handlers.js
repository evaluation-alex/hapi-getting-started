'use strict';
const _ = require('./../lodash');
const Bluebird = require('bluebird');
const utils = require('./utils');
const {isFunction} = _;
const {org, by, logAndBoom, findopts, profile} = utils;
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
        const {fields, sort, limit, page} = request.query;
        const query = request.pre.mongoQuery;
        Model.pagedFind(query, findopts(fields), findopts(sort), limit, page)
            .catch(logAndBoom)
            .then(reply)
            .finally(() => timing(start));
    };
};
const buildFindOneHandler = function buildFindOneHandler(Model) {
    const timing = profile('handler', {collection: Model.collection, method: 'findOne', type: 'main'});
    return function findOneHandler(request, reply) {
        const start = Date.now();
        Bluebird.resolve(request.pre[Model.collection])
            .catch(logAndBoom)
            .then(reply)
            .finally(() => timing(start));
    };
};
const buildUpdateHandler = function buildUpdateHandler(Model, updateCb) {
    const timing = profile('handler', {collection: Model.collection, method: 'update', type: 'main'});
    const update = Bluebird.method((u, request, by) =>
        isFunction(updateCb) ?
            updateCb(u, request, by) :
            u[updateCb](request, by)
    );
    return function updateHandler(request, reply) {
        const start = Date.now();
        const toUpdate = request.pre[Model.collection];
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
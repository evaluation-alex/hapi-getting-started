'use strict';
const _ = require('./../lodash');
const Bluebird = require('bluebird');
const utils = require('./utils');
const {isFunction, merge} = _;
const {org, user, by, logAndBoom, hasItems, findopts, timing} = utils;
const buildCreateHandler = function buildCreateHandler(Model) {
    const tags = {collection: Model.collection, method: 'create', type: 'main'};
    return function createHandler(request, reply) {
        const start = Date.now();
        Model.newObject(request, by(request))
            .catch(logAndBoom)
            .then(reply)
            .finally(() => timing('handler', tags, {elapsed: Date.now() - start}));
    };
};
const buildFindHandler = function buildFindHandler(Model) {
    const tags = {collection: Model.collection, method: 'find', type: 'main'};
    return function findHandler(request, reply) {
        const start = Date.now();
        const {fields, sort, limit, page} = request.query;
        const query = request.pre.mongoQuery;
        Model.pagedFind(query, findopts(fields), findopts(sort), limit, page)
            .catch(logAndBoom)
            .then(reply)
            .finally(() => timing('handler', tags, {elapsed: Date.now() - start}));
    };
};
const buildFindOneHandler = function buildFindOneHandler(Model) {
    const tags = {collection: Model.collection, method: 'findOne', type: 'main'};
    return function findOneHandler(request, reply) {
        const start = Date.now();
        Bluebird.resolve(request.pre[Model.collection])
            .catch(logAndBoom)
            .then(reply)
            .finally(() => timing('handler', tags, {elapsed: Date.now() - start}));
    };
};
const buildUpdateHandler = function buildUpdateHandler(Model, updateCb) {
    const tags = {collection: Model.collection, method: 'update', type: 'main'};
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
            .finally(() => timing('handler', tags, {elapsed: Date.now() - start}));
    };
};
module.exports = {
    buildCreateHandler,
    buildFindHandler,
    buildFindOneHandler,
    buildUpdateHandler
};

'use strict';
const _ = require('lodash');
const Bluebird = require('bluebird');
const utils = require('./utils');
const {isFunction, merge} = _;
const {org, user, by, logAndBoom, hasItems, buildQuery, findopts, timing} = utils;
const buildCreateHandler = function buildCreateHandler(Model) {
    const tags = {collection: Model.collection, method: 'create', type: 'main'};
    return function createHandler(request, reply) {
        const start = Date.now();
        Model.newObject(request, by(request))
            .catch(logAndBoom)
            .then(reply)
            .finally(() => {
                timing('handler', tags, {elapsed: Date.now() - start});
            });
    };
};
const buildFindHandler = function buildFindHandler(Model, queryBuilder) {
    const tags = {collection: Model.collection, method: 'find', type: 'main'};
    const buildQueryFrom = Bluebird.method(request => isFunction(queryBuilder) ? queryBuilder(request) : buildQuery(request, queryBuilder));
    return function findHandler(request, reply) {
        const start = Date.now();
        const {fields, sort, limit, page} = request.query;
        buildQueryFrom(request)
            .then(query => {
                query.organisation = query.organisation || org(request);
                if (request.query.isActive) {
                    query.isActive = request.query.isActive === '"true"';
                }
                return Model.pagedFind(query, findopts(fields), findopts(sort), limit, page);
            })
            .then(output => {
                if (hasItems(output.data) && isFunction(output.data[0].populate)) {
                    return Bluebird.all(output.data.map(item => item.populate(by(request))))
                        .then(op => {
                            output.data = op;
                            return output;
                        });
                } else {
                    return output;
                }
            })
            .catch(logAndBoom)
            .then(reply)
            .finally(() => {
                timing('handler', tags, {elapsed: Date.now() - start});
            });
    };
};
const buildFindOneHandler = function buildFindOneHandler(Model) {
    const tags = {collection: Model.collection, method: 'findOne', type: 'main'};
    const findOne = Bluebird.method((obj, user) => isFunction(obj.populate) ? obj.populate(user) : obj);
    return function findOneHandler(request, reply) {
        const start = Date.now();
        findOne(request.pre[Model.collection], user(request))
            .catch(logAndBoom)
            .then(reply)
            .finally(() => {
                timing('handler', tags, {elapsed: Date.now() - start});
            });
    };
};
const buildUpdateHandler = function buildUpdateHandler(Model, updateCb) {
    const tags = {collection: Model.collection, method: 'update', type: 'main'};
    const update = Bluebird.method((u, request, by) => isFunction(updateCb) ? updateCb(u, request, by) : u[updateCb](request, by));
    return function updateHandler(request, reply) {
        const start = Date.now();
        update(request.pre[Model.collection], request, by(request))
            .then(u => u.save())
            .catch(logAndBoom)
            .then(reply)
            .finally(() => {
                timing('handler', tags, {elapsed: Date.now() - start});
            });
    };
};
module.exports = {
    buildCreateHandler,
    buildFindHandler,
    buildFindOneHandler,
    buildUpdateHandler
};

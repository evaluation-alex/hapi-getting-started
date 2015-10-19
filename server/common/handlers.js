'use strict';
import {isFunction} from 'lodash';
import Bluebird from 'bluebird';
import {org, user, by, logAndBoom} from './utils';
export function buildCreateHandler (Model, newCb) {
    const createNew = Bluebird.method((request, by) => newCb ? newCb(request, by) : Model.newObject(request, by));
    return function createHandler(request, reply) {
        createNew(request, by(request))
            .then(n => {
                reply(n).code(201);
            })
            .catch(err => {
                logAndBoom(err, reply);
            });
    };
}
export function buildFindHandler(Model, queryBuilder, findCb) {
    const postProcess = Bluebird.method((output, user) => findCb ? findCb(output, user) : output);
    const buildQueryFrom = Bluebird.method(request => queryBuilder(request));
    return function findHandler(request, reply) {
        const decorateQuery = Bluebird.method(query => {
            query.organisation = query.organisation ||
                {$regex: new RegExp('^.*?' + org(request) + '.*$', 'i')};
            if (request.query.isActive) {
                query.isActive = request.query.isActive === '"true"';
            }
            return query;
        });
        const {fields, sort, limit, page} = request.query;
        buildQueryFrom(request)
            .then(decorateQuery)
            .then(query =>
                Model.pagedFind(query, fields, sort, limit, page)
        )
            .then(output =>
                postProcess(output, user(request))
        )
            .then(reply)
            .catch(err => {
                logAndBoom(err, reply);
            });
    };
}
export function buildFindOneHandler(Model, findOneCb) {
    const findOne = Bluebird.method((output, user) => findOneCb ? findOneCb(output, user) : output);
    return function findOneHandler(request, reply) {
        findOne(request.pre[Model.collection], user(request))
            .then(reply)
            .catch(err => {
                logAndBoom(err, reply);
            });
    };
}
export function buildUpdateHandler(Model, updateCb) {
    const update = Bluebird.method((u, request, by) => isFunction(updateCb) ? updateCb(u, request, by) : u[updateCb](request, by));
    return function updateHandler(request, reply) {
        update(request.pre[Model.collection], request, by(request))
            .then(u => u.save())
            .then(reply)
            .catch(err => {
                logAndBoom(err, reply);
            });
    };
}


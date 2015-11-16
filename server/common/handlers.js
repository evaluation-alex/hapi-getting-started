'use strict';
import {isFunction} from 'lodash';
import Bluebird from 'bluebird';
import {org, user, by, logAndBoom, hasItems, buildQuery} from './utils';
export function buildCreateHandler(Model) {
    return function createHandler(request, reply) {
        Model.newObject(request, by(request))
            .catch(logAndBoom)
            .then(reply);
    };
}
export function buildFindHandler(Model, queryBuilder) {
    const buildQueryFrom = Bluebird.method(request => isFunction(queryBuilder) ? queryBuilder(request) : buildQuery(request, queryBuilder));
    return function findHandler(request, reply) {
        const {fields, sort, limit, page} = request.query;
        buildQueryFrom(request)
            .then(query => {
                query.organisation = query.organisation ||
                    {$regex: new RegExp(`^.*?${org(request)}.*$`, 'i')};
                if (request.query.isActive) {
                    query.isActive = request.query.isActive === '"true"';
                }
                return Model.pagedFind(query, fields, sort, limit, page);
            })
            .then(output => {
                if (hasItems(output.data) && isFunction(output.data[0].populate)) {
                    const user = by(request);
                    return Bluebird.all(output.data.map(item => item.populate(user)))
                        .then(op => {
                            output.data = op;
                            return output;
                        });
                } else {
                    return output;
                }
            })
            .catch(logAndBoom)
            .then(reply);
    };
}
export function buildFindOneHandler(Model) {
    const findOne = Bluebird.method((obj, user) => isFunction(obj.populate) ? obj.populate(user) : obj);
    return function findOneHandler(request, reply) {
        findOne(request.pre[Model.collection], user(request))
            .catch(logAndBoom)
            .then(reply);
    };
}
export function buildUpdateHandler(Model, updateCb) {
    const update = Bluebird.method((u, request, by) => isFunction(updateCb) ? updateCb(u, request, by) : u[updateCb](request, by));
    return function updateHandler(request, reply) {
        update(request.pre[Model.collection], request, by(request))
            .then(u => u.save())
            .catch(logAndBoom)
            .then(reply);
    };
}


'use strict';
let Bluebird = require('bluebird');
let utils = require('./../utils');
module.exports = (Model, queryBuilder, findCb) => {
    let findHook = Bluebird.method((output, user) => findCb ? findCb(output, user) : output);
    let qb = Bluebird.method((request) => queryBuilder(request));
    return (request, reply) => {
        qb(request)
            .then((query) => {
                query.organisation = query.organisation ||
                    {$regex: new RegExp('^.*?' + utils.org(request) + '.*$', 'i')};
                if (request.query.isActive) {
                    query.isActive = request.query.isActive === '"true"';
                }
                return query;
            }
        )
            .then((query) =>
                Model.pagedFind(query, request.query.fields, request.query.sort, request.query.limit, request.query.page)
        )
            .then((output) =>
                findHook(output, utils.user(request))
        )
            .then(reply)
            .catch((err) =>
                utils.logAndBoom(err, reply)
        );
    };
};

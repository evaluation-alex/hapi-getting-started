'use strict';
let Promise = require('bluebird');
let utils = require('./../utils');
module.exports = function FindHandler (Model, queryBuilder, findCb) {
    let findHook = Promise.method((output, user) => findCb ? findCb(output, user) : output);
    return (request, reply) => {
        let query = queryBuilder(request);
        query.organisation = query.organisation ||
        {$regex: new RegExp('^.*?' + request.auth.credentials.user.organisation + '.*$', 'i')};
        if (request.query.isActive) {
            query.isActive = request.query.isActive === '"true"';
        }
        Model.pagedFind(query, request.query.fields, request.query.sort, request.query.limit, request.query.page)
            .then((output) => findHook(output, request.auth.credentials.user))
            .then(reply)
            .catch((err) => utils.logAndBoom(err, reply));
    };
};

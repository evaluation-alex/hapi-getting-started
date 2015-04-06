'use strict';
var Promise = require('bluebird');
let utils = require('./../utils');
module.exports = function FindHandler (Model, queryBuilder, findCb) {
    /*jshint unused:false*/
    let findHook = (output) => new Promise((resolve, reject) =>
            resolve(findCb ?
                    findCb(output) :
                    output
            )
    );
    /*jshint unused:true*/
    return (request, reply) => {
        let query = queryBuilder(request);
        query.organisation = query.organisation ||
        {$regex: new RegExp('^.*?' + request.auth.credentials.user.organisation + '.*$', 'i')};
        if (request.query.isActive) {
            query.isActive = request.query.isActive === '"true"';
        }
        Model.pagedFind(query, request.query.fields, request.query.sort, request.query.limit, request.query.page)
            .then(findHook)
            .then(reply)
            .catch((err) => utils.logAndBoom(err, reply));
    };
};

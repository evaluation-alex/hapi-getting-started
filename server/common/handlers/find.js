'use strict';
var Promise = require('bluebird');
let utils = require('./../utils');
module.exports = function FindHandler (Model, queryBuilder, findCb) {
    let findHook = function findObjsCb (output) {
        /*jshint unused:false*/
        return new Promise(function (resolve, reject) {
            resolve(findCb ? findCb(output) : output);
        });
        /*jshint unused:true*/
    };
    return function findHandler (request, reply) {
        let query = queryBuilder(request);
        query.organisation = query.organisation || {$regex: new RegExp('^.*?' + request.auth.credentials.user.organisation + '.*$', 'i')};
        if (request.query.isActive) {
            query.isActive = request.query.isActive === '"true"';
        }
        Model.pagedFind(query, request.query.fields, request.query.sort, request.query.limit, request.query.page)
            .then(findHook)
            .then(reply)
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};

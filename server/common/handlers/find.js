'use strict';
var Promise = require('bluebird');
var utils = require('./../utils');
module.exports = function FindHandler (Model, queryBuilder, findCb) {
    var findHook = function findObjsCb (output) {
        /*jshint unused:false*/
        return new Promise(function (resolve, reject) {
            resolve(findCb ? findCb(output) : output);
        });
        /*jshint unused:true*/
    };
    return function findHandler (request, reply) {
        var query = queryBuilder(request);
        query.organisation = query.organisation || {$regex: new RegExp('^.*?' + request.auth.credentials.user.organisation + '.*$', 'i')};
        if (request.query.isActive) {
            query.isActive = request.query.isActive === '"true"';
        }
        var fields = request.query.fields;
        var sort = request.query.sort;
        var limit = request.query.limit;
        var page = request.query.page;
        Model.pagedFind(query, fields, sort, limit, page)
            .then(findHook)
            .then(reply)
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};

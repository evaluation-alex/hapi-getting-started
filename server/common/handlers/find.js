'use strict';
var Promise = require('bluebird');
var utils = require('./../utils');
var _ = require('lodash');

module.exports = function createFindHandler (Model, queryBuilder, i18nEnabled, findCb) {
    var findHook = function findObjsCb(output) {
        return Promise.resolve(findCb ? findCb(output): output);
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
        Model._pagedFind(query, fields, sort, limit, page)
            .then(findHook)
            .then(function (output) {
                if (i18nEnabled) {
                    _.forEach(output.data, function (o) {
                        o.i18n(utils.locale(request));
                    });
                }
                reply(output);
            })
            .catch(function (err) {
                utils.logAndBoom(err, reply);
            });
    };
};

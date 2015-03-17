'use strict';
var _ = require('lodash');
var utils = require('./../utils');
var errors = require('./../errors');
var Promise = require('bluebird');

module.exports = function (Model, idToUse) {
    return {
        assign: Model._collection,
        method: function prePopulate (request, reply) {
            var type = _.capitalize(Model._collection);
            if (request.pre['validAndPermitted' + type]) {
                reply(request.pre['validAndPermitted' + type]);
            } else {
                var id = request.params[idToUse] ? request.params[idToUse] : request.payload[idToUse];
                Model._findOne({_id: Model.ObjectID(id)})
                    .then(function (obj) {
                        if (!obj) {
                            return Promise.reject(new errors.UserNotFoundError({type: type, idstr: id.toString()}));
                        }
                        reply(obj);
                    })
                    .catch(function (err) {
                        utils.logAndBoom(err, utils.locale(request), reply);
                    });
            }
        }
    };
};

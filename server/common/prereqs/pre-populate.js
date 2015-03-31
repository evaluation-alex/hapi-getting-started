'use strict';
var _ = require('lodash');
var utils = require('./../utils');
var errors = require('./../errors');
var Promise = require('bluebird');

module.exports = function prePopulate (Model, idToUse) {
    return {
        assign: Model._collection,
        method: function prePopulateObject (request, reply) {
            var id = utils.lookupParamsOrPayloadOrQuery(request, idToUse);
            Model._findOne({_id: Model.ObjectID(id)})
                .then(function (obj) {
                    if (!obj) {
                        return Promise.reject(new errors.ObjectNotFoundError({
                            type: _.capitalize(Model._collection),
                            idstr: id.toString()
                        }));
                    }
                    reply(obj);
                })
                .catch(function (err) {
                    utils.logAndBoom(err, reply);
                });
        }
    };
};

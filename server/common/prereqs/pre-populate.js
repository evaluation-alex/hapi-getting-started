'use strict';
let _ = require('lodash');
let utils = require('./../utils');
let errors = require('./../errors');
var Promise = require('bluebird');
module.exports = function prePopulate (Model, idToUse) {
    return {
        assign: Model.collection,
        method: function prePopulateObject (request, reply) {
            let id = utils.lookupParamsOrPayloadOrQuery(request, idToUse);
            Model.findOne({_id: Model.ObjectID(id)})
                .then(function (obj) {
                    if (!obj) {
                        return Promise.reject(new errors.ObjectNotFoundError({
                            type: _.capitalize(Model.collection),
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

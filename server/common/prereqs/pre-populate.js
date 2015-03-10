'use strict';
var Boom = require('boom');
var _ = require('lodash');
var utils = require('./../utils');

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
                        reply(obj ? obj : Boom.notFound(type + ' (' + id.toString() + ') not found'));
                    })
                    .catch(function (err) {
                        utils.logAndBoom(err, reply);
                    });
            }
        }
    };
};

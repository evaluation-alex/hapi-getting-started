'use strict';
var Boom = require('boom');
var _ = require('lodash');
var i18n = require('./../../../config').i18n;
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
                        if (obj) {
                            reply(obj);
                        } else {
                            reply(Boom.notFound(i18n.__({
                                phrase: '{{type}} ({{idstr}}) not found',
                                locale: utils.locale(request)
                            }, {
                                type: type,
                                idstr: id.toString()
                            })));
                        }
                    })
                    .catch(function (err) {
                        utils.logAndBoom(err, utils.locale(request), reply);
                    });
            }
        }
    };
};

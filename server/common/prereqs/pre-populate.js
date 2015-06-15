'use strict';
let _ = require('lodash');
let utils = require('./../utils');
let errors = require('./../errors');
let Bluebird = require('bluebird');
module.exports = (Model, idToUse) => {
    return {
        assign: Model.collection,
        method: (request, reply) => {
            let id = utils.lookupParamsOrPayloadOrQuery(request, idToUse);
            Model.findOne({_id: Model.ObjectID(id)})
                .then((obj) => {
                    if (!obj) {
                        return Bluebird.reject(new errors.ObjectNotFoundError({
                            type: _.capitalize(Model.collection),
                            idstr: id.toString()
                        }));
                    }
                    reply(obj);
                })
                .catch((err) => utils.logAndBoom(err, reply));
        }
    };
};

'use strict';
let _ = require('lodash');
var Promise = require('bluebird');
let utils = require('./../utils');
module.exports = function decorateWithAreValid (Model, property) {
    Model.areValid = Promise.method((toCheck, organisation) => {
        let self = this;
        if (!utils.hasItems(toCheck)) {
            return {};
        } else {
            let conditions = {
                isActive: true,
                organisation: organisation
            };
            if (property === '_id') {
                toCheck = _.map(toCheck, (id) => self.ObjectID(id));
            }
            conditions[property] = {$in: toCheck};
            return self.find(conditions)
                .then((docs) => {
                    let results = Object.create(null);
                    _.forEach(docs, (doc) => results[doc[property]] = true);
                    _.forEach(toCheck, (e) => results[e] = !!results[e]);
                    return results;
                });
        }
    });
    return Model;
};

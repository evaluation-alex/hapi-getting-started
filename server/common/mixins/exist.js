'use strict';
let _ = require('lodash');
var Promise = require('bluebird');
let utils = require('./../utils');
module.exports = function CommonAreValid (property) {
    return {
        areValid: function areValid (toCheck, organisation) {
            let self = this;
            if (!utils.hasItems(toCheck)) {
                return Promise.resolve({});
            } else {
                let conditions = {
                    isActive: true,
                    organisation: organisation
                };
                conditions[property] = {$in: toCheck};
                return self.find(conditions)
                    .then(function (docs) {
                        let results = Object.create(null);
                        _.forEach(docs, function (doc) {
                            results[doc[property]] = true;
                        });
                        _.forEach(toCheck, function (e) {
                            if (!results[e]) {
                                results[e] = false;
                            }
                        });
                        return results;
                    });
            }
        }
    };
};

'use strict';
var _ = require('lodash');
var Promise = require('bluebird');
var utils = require('./../utils');

module.exports = function CommonAreValid (property) {
    return {
        areValid: function areValid (toCheck, organisation) {
            var self = this;
            if (!utils.hasItems(toCheck)) {
                return Promise.resolve({});
            } else {
                var conditions = {};
                conditions[property] = {$in: toCheck};
                conditions.isActive = true;
                conditions.organisation = organisation;
                return self._find(conditions)
                    .then(function (docs) {
                        var results = Object.create(null);
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

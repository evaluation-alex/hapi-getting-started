'use strict';
var _ = require('lodash');

module.exports = function CommonMixinProperties (properties) {
    var ret = {};
    _.forEach(properties, function (property) {
        ret['set' + _.capitalize(property)] = function (newValue, by) {
            var self = this;
            if (!_.isUndefined(newValue) && !_.isEqual(self[property], newValue)) {
                self._audit(property, self[property], newValue, by);
                self[property] = newValue;
            }
            return self;
        };
    });
    return ret;
};


'use strict';
var _ = require('lodash');
var traverse = require('traverse');

module.exports = function CommonMixinProperties (properties) {
    var ret = {};
    _.forEach(properties, function (property) {
        var path = property.split('.');
        var name = path.map(_.capitalize).join('');
        ret['set' + name] = function (newValue, by) {
            var self = this;
            var origval = traverse(self).get(path);
            if (!_.isUndefined(newValue) && !_.isEqual(origval, newValue)) {
                self._audit(property, origval, newValue, by);
                traverse(self).set(path, newValue);
            }
            return self;
        };
    });
    return ret;
};


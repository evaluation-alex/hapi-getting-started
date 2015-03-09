'use strict';
var _ = require('lodash');

module.exports = function CommonMixinUpdate (properties, lists) {
    return {
        update: function (doc, by) {
            var self = this;
            _.forIn(properties, function (value, key) {
                self['set' + _.capitalize(key)](doc.payload[value], by);
            });
            _.forIn(lists, function (value, key) {
                self.add(doc.payload['added' + _.capitalize(value)], key, by);
                self.remove(doc.payload['removed' + _.capitalize(value)], key, by);
            });
            return self;
        }
    };
};

'use strict';
var _ = require('lodash');

module.exports = function CommonMixinUpdate (properties, lists) {
    return {
        update: function update (doc, by) {
            var self = this;
            _.forEach(properties, function (property) {
                self['set' + property.split('.').map(_.capitalize).join('')](doc.payload[property], by);
            });
            _.forEach(lists, function (list) {
                var c = _.capitalize(list);
                if (doc.payload['added' + c]) {
                    self.add(doc.payload['added' + c], list, by);
                }
                if (doc.payload['removed' + c]) {
                    self.remove(doc.payload['removed' + c], list, by);
                }
            });
            return self;
        }
    };
};

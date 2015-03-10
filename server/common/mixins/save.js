'use strict';
var _ = require('lodash');
var insertAudit = require('./insert-audit');

module.exports = function CommonMixinSave (Model) {
    return {
        save: function save () {
            var self = this;
            if (self.audit && self.audit.length > 0) {
                _.forEach(self.audit, insertAudit);
                self.audit = [];
            }
            return Model._findByIdAndUpdate(self._id, self);
        }
    };
};


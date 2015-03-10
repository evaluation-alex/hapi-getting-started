'use strict';
var insertAudit = require('./insert-audit');

module.exports = function CommonMixinSave (Model) {
    return {
        save: function save () {
            var self = this;
            insertAudit(self.audit);
            delete self.audit;
            return Model._findByIdAndUpdate(self._id, self);
        }
    };
};


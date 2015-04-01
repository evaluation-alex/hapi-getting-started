'use strict';
var saveChangeHistory = require('./insert-audit');

module.exports = function CommonMixinSave (Model) {
    return {
        save: function save () {
            var self = this;
            saveChangeHistory(self.audit);
            self.audit = undefined;
            return Model._findOneAndReplace({_id: self._id}, self);
        }
    };
};


'use strict';
let saveChangeHistory = require('./save-change-history');
module.exports = function CommonMixinSave (Model) {
    return {
        save: function save () {
            let self = this;
            saveChangeHistory(self.audit);
            self.audit = undefined;
            return Model.save(self);
        }
    };
};


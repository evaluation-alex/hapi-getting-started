'use strict';
let saveChangeHistory = require('./save-change-history');
module.exports = function Save(Model) {
    return {
        save: () => {
            let self = this;
            saveChangeHistory(self.audit);
            self.audit = undefined;
            return Model.save(self);
        }
    };
};


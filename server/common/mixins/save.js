'use strict';
let saveChangeHistory = require('./save-change-history');
module.exports = function decorateWithSave (model, Model) {
    model.save = () => {
        let self = this;
        saveChangeHistory(self.audit);
        self.audit = undefined;
        return Model.save(self);
    };
    return model;
};


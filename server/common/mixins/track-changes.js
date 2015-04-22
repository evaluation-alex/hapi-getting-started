'use strict';
module.exports = (Model, type, idToUse) => {
    Model.trackChanges = (action, oldValues, newValues, by) => {
        let self = this;
        self.audit = self.audit || {
            objectChangedType: type,
            objectChangedId: self[idToUse],
            organisation: self.organisation,
            by: by,
            on: new Date(),
            change: []
        };
        self.audit.change.push({action: action, origValues: oldValues, newValues: newValues});
        self.updatedBy = self.audit.by = by;
        self.updatedOn = self.audit.on = new Date();
        return self;
    };
    return Model;
};

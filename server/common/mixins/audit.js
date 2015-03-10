'use strict';
module.exports = function CommonMixinAudit (type, idToUse) {
    return {
        _audit: function audit (action, oldValues, newValues, by) {
            var self = this;
            if (!self.audit) {
                self.audit = {
                    objectChangedType: type,
                    objectChangedId: self[idToUse],
                    organisation: self.organisation,
                    by: by,
                    on: new Date(),
                    change: []
                };
            }
            self.audit.change.push({action: action, origValues: oldValues, newValues: newValues});
            self.updatedBy = self.audit.by = by;
            self.updatedOn = self.audit.on = new Date();
            return self;
        }
    };
};

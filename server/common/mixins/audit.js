'use strict';
module.exports = function CommonMixinAudit (type, idToUse) {
    return {
        _audit: function (action, oldValues, newValues, by) {
            var self = this;
            if (!self.audit) {
                self.audit = [];
            }
            self.audit.push({
                objectChangedType: type,
                objectChangedId: self[idToUse],
                action: action,
                origValues: oldValues,
                newValues: newValues,
                organisation: self.organisation,
                by: by,
                timestamp: new Date()
            });
            self.updatedBy = by;
            self.updatedOn = new Date();
            return self;
        }
    };
};

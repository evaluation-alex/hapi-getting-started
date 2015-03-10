'use strict';
var _ = require('lodash');
var insertAudit = require('./insert-audit');

module.exports = function InsertAndAudit (idToUse, action) {
    return {
        _insertAndAudit: function insertAndAudit (doc) {
            var self = this;
            return self._insert(doc)
                .then(function (obj) {
                    if (!obj) {
                        return false;
                    } else {
                        var audit = {
                            objectChangedType: _.capitalize(self._collection),
                            objectChangedId: obj[0][idToUse],
                            action: action,
                            origValues: null,
                            newValues: doc,
                            organisation: obj[0].organisation,
                            by: obj[0].createdBy,
                            timestamp: new Date()
                        };
                        insertAudit(audit);
                    }
                    return obj[0];
                });
        }
    };
};

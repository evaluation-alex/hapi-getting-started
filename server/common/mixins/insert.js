'use strict';
var saveChangeHistory = require('./save-change-history');
var errors = require('./../errors');
var Promise = require('bluebird');
module.exports = function InsertAndAudit (idToUse, action) {
    return {
        insertAndAudit: function insertAndAudit (doc) {
            var self = this;
            return self.insert(doc)
                .then(function (obj) {
                    if (!obj) {
                        return Promise.reject(new errors.ObjectNotCreatedError({collection: self.collection}));
                    } else {
                        saveChangeHistory({
                            objectChangedType: self.collection,
                            objectChangedId: obj[idToUse],
                            organisation: obj.organisation,
                            by: obj.createdBy,
                            on: new Date(),
                            change: [{
                                action: action,
                                origValues: null,
                                newValues: doc
                            }]
                        });
                        return obj;
                    }
                });
        }
    };
};

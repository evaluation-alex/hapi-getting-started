'use strict';
let saveChangeHistory = require('./save-change-history');
let errors = require('./../errors');
var Promise = require('bluebird');
module.exports = function InsertAndAudit (idToUse, action) {
    return {
        insertAndAudit: (doc) => {
            let self = this;
            return self.insert(doc)
                .then((obj) => {
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

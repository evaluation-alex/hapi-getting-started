'use strict';
var insertAudit = require('./insert-audit');
var errors = require('./../errors');
var Promise = require('bluebird');

module.exports = function InsertAndAudit (idToUse, action) {
    return {
        _insertAndAudit: function insertAndAudit (doc) {
            var self = this;
            return self._insertOne(doc)
                .then(function (obj) {
                    if (!obj) {
                        return Promise.reject(new errors.ObjectNotCreatedError({collection: self._collection}));
                    } else {
                        var audit = {
                            objectChangedType: self._collection,
                            objectChangedId: obj[0][idToUse],
                            organisation: obj[0].organisation,
                            by: obj[0].createdBy,
                            on: new Date(),
                            change: [{
                                action: action,
                                origValues: null,
                                newValues: doc
                            }]
                        };
                        insertAudit(audit);
                    }
                    return obj[0];
                });
        }
    };
};

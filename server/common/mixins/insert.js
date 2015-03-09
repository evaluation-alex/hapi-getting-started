'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var _ = require('lodash');
var logger = require('./../../../config').logger;

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
                        var collection = BaseModel.db.collection('audit');
                        /*jshint unused:false*/
                        collection.insert(audit, function (err, doc) {
                            if (err) {
                                logger.error({error: err, stack: err.stack});
                            }
                        });
                        /*jshint unused:true*/
                    }
                    return obj[0];
                });
        }
    };
};

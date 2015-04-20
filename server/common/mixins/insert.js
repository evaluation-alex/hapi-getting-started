'use strict';
let saveChangeHistory = require('./save-change-history');
let errors = require('./../errors');
let Bluebird = require('bluebird');
module.exports = function decorateWithInsertAndAudit (Model, idToUse, action) {
    Model.insertAndAudit = (doc) => {
        let self = this;
        return self.insert(doc)
            .then((obj) => {
                if (!obj) {
                    return Bluebird.reject(new errors.ObjectNotCreatedError({collection: self.collection}));
                } else {
                    return saveChangeHistory({
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
                    })
                        .then(() => obj);
                }
            });
    };
    return Model;
};

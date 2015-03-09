'use strict';
var logger = require('./../../../config').logger;
var _ = require('lodash');
var BaseModel = require('hapi-mongo-models').BaseModel;

module.exports = function CommonMixinSave (Model) {
    return {
        _saveAudit: function () {
            var self = this;
            if (self.audit && self.audit.length > 0) {
                _.forEach(self.audit, function (audit) {
                    var collection = BaseModel.db.collection('audit');
                    /*jshint unused:false*/
                    collection.insert(audit, function (err, doc) {
                        if (err) {
                            logger.error({error: err, stack: err.stack});
                        }
                    });
                    /*jshint unused:true*/
                });
                self.audit = [];
            }
            return self;
        },
        save: function () {
            var self = this;
            return Model._findByIdAndUpdate(self._id, self._saveAudit());
        }
    };
};


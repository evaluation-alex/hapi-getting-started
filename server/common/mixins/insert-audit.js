'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var logger = require('./../../../config').logger;

module.exports = function insertAudit (audit) {
    var collection = BaseModel.db.collection('audit');
    /*jshint unused:false*/
    collection.insert(audit, function (err, doc) {
        if (err) {
            logger.error({error: err, stack: err.stack});
        }
    });
    /*jshint unused:true*/
};
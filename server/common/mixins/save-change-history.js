'use strict';
var BaseModel = require('./../model');
//require('hapi-mongo-models').BaseModel;
var utils = require('./../utils');
var _ = require('lodash');
module.exports = function saveChangeHistory (audit) {
    if (audit) {
        BaseModel.db.collection('audit').insert(audit, utils.defaultcb('audit.insert', _.noop, _.noop));
    }
};
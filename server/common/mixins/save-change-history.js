'use strict';
var Model = require('./../model');
var utils = require('./../utils');
var _ = require('lodash');
module.exports = function saveChangeHistory (audit) {
    if (audit) {
        Model.db.collection('audit').insert(audit, utils.defaultcb('audit.insert', _.noop, _.noop));
    }
};
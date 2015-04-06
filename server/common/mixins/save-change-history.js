'use strict';
let Model = require('./../model');
let utils = require('./../utils');
let _ = require('lodash');
module.exports = function SaveChangeHistory (audit) {
    if (audit) {
        Model.db.collection('audit').insert(audit, utils.defaultcb('audit.insert', _.noop, _.noop));
    }
};
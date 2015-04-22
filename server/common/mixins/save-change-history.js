'use strict';
let Model = require('./../model');
let utils = require('./../utils');
let Bluebird = require('bluebird');
module.exports = (audit) =>
    new Bluebird((resolve, reject) => {
        if (audit) {
            Model.db('app').collection('audit').insert(audit, utils.defaultcb('audit.insert', resolve, reject));
        } else {
            resolve(true);
        }
    });

'use strict';
let Glue = require('glue');
let Promise = require('bluebird');
module.exports = (Manifest) => {
    return new Promise((resolve, reject) => {
        Glue.compose(Manifest, {relativeTo: __dirname + '/../../'}, (err, server1) => {
            err ? reject(err) : resolve(server1);
        });
    });
};
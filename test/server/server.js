'use strict';
let Glue = require('glue');
let Promise = require('bluebird');
module.exports = (Manifest) => {
    return new Promise((resolve, reject) => {
        Glue.compose(Manifest, {relativeTo: __dirname + '/../../'}, (err, server1) => {
            if (err) {
                reject(err);
            } else {
                server1.register(require('inject-then'), (err) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(server1);
                });
            }
        });
    });
};
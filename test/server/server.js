'use strict';
let Glue = require('glue');
let _ = require('lodash');
let Path = require('path');
let Promise = require('bluebird');

module.exports = (Manifest) => {
    return new Promise((resolve, reject) => {
        Glue.compose(Manifest.manifest, {relativeTo: __dirname + '/../../'}, (err, server1) => {
            if (err) {
                return reject(err);
            }
            _.forEach(Manifest.components, (component) => {
                try {
                    let c = Path.normalize(Path.join(__dirname, '\\..\\..', component));
                    server1.route(require(c));
                } catch (err) {
                    console.log(err, err.stack);
                }
            });
            return resolve(server1);
        });
    });
};
'use strict';
/*eslint-disable no-unused-expressions*/
let Bluebird = require('bluebird');
let path = require('path');
let Glue = require('glue');
let injectThen = require('inject-then');
let config = require('./../../server/config');
module.exports = function() {
    config.manifest.plugins['./server/common/plugins/app-routes'].prependRoute = '';
    return new Bluebird((resolve, reject) => {
        Glue.compose(config.manifest, {relativeTo: path.join(__dirname, './../../')}, (err, server1) => {
            if (err) {
                reject(err);
            } else {
                server1.register(injectThen, (err2) => {
                    if (err2) {
                        reject(err2);
                    }
                    resolve(server1);
                });
            }
        });
    });
};

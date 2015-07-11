'use strict';
/*eslint-disable no-unused-expressions*/
let Bluebird = require('bluebird');
let path = require('path');
module.exports = (Manifest) => {
    Manifest.plugins['./server/common/plugins/app-routes'].prependRoute = '';
    return new Bluebird((resolve, reject) => {
        require('glue').compose(Manifest, {relativeTo: path.join(__dirname, './../../')}, (err, server1) => {
            if (err) {
                reject(err);
            } else {
                server1.register(require('inject-then'), (err2) => {
                    if (err2) {
                        reject(err2);
                    }
                    resolve(server1);
                });
            }
        });
    });
};

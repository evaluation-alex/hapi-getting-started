'use strict';
let MongoClient = require('mongodb').MongoClient;
let opts = require('./../server/options.json');
let mongourl = opts.manifest.plugins['./build/common/plugins/connections'].mongo.app.url;
module.exports = function (gulp, $) {
    return function (cb) {
        let db;
        MongoClient.connect(mongourl)
            .then((dbconn) => {
                db = dbconn;
                return db.collections();
            })
            .then((collections) => {
                collections.forEach((collection) => {
                    if (!(collection.collectionName.startsWith('system.'))) {
                        $.gutil.log('[server:test:clean] dropping ' + collection.collectionName);
                        collection.drop();
                    }
                });
            })
            .then(() => {
                db.close();
                cb();
            })
            .catch(err => {
                cb(err);
            });
    }
};

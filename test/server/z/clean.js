'use strict';
let tu = require('./../testutils');
let MongoClient = require('mongodb').MongoClient;
let opts = require('./../../../server/options.json');
let mongourl = opts.manifest.plugins['./build/common/plugins/connections'].mongo.app.url;
describe('cleanup', () => {
    it('should drop all tables', (done) => {
        MongoClient.connect(mongourl)
            .then((dbconn) => {
                return dbconn.collections();
            })
            .then(collections => {
                return collections
                    .filter(collection => !collection.collectionName.startsWith('system'))
                    .map(collection => {
                        console.log('[test:clean] dropping ' + collection.collectionName);
                        return collection.drop();
                    });
            })
            .then(() => done())
            .catch(err => done());
    });
    it('should setup basic users and roles again', (done) => {
        tu.setupRolesAndUsers()
            .then(() => done())
            .catch(err => done());
    })
});

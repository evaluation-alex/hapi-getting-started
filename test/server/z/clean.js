'use strict';
let tu = require('./../testutils');
let MongoClient = require('mongodb').MongoClient;
let opts = require('./../../../build/server/options.json');
let mongourl = opts.manifest.plugins['./plugins/connections'].mongo.app.url2;
describe('cleanup', () => {
    it('should drop all tables', (done) => {
        MongoClient.connect(mongourl)
            .then((dbconn) => {
                return dbconn.collections();
            })
            .then(collections => {
                return Bluebird.all(
                    collections
                        .filter(collection => !collection.collectionName.startsWith('system'))
                        .map(collection => {
                            return new Bluebird((resolve, reject) => {
                                console.log('[test:clean] dropping ' + collection.collectionName);
                                collection.drop((err, res) => err ? reject(err) : resolve(res));
                            });
                        })
                );
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

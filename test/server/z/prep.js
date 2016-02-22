'use strict';
let _ = require('lodash');
let fs = require('fs');
let Bluebird = require('bluebird');
let config = require('./../../../build/server/options.json');
let influxdb = Bluebird.promisifyAll(require('influx')({
    host: config.influxdb.host,
    port: config.influxdb.httpport,
    protocol: 'http'
}));
describe('prep', () => {
    it('should setup influxdb', (done) => {
        influxdb.getDatabaseNamesAsync()
            .then(dbNames => {
                if (dbNames.indexOf(config.influxdb.database) === -1) {
                    return influxdb.createDatabaseAsync(config.influxdb.database);
                }
            })
            .then(() => done())
            .catch(err => done());
    });
});

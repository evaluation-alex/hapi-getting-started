'use strict';
let _ = require('lodash');
let fs = require('fs');
let Bluebird = require('bluebird');
let json2csv = Bluebird.promisify(require('json2csv'));
let config = require('./../../../server/options.json');
let influxdb = Bluebird.promisifyAll(require('influx')({
    host: config.influxdb.host,
    port: config.influxdb.httpport,
    protocol: 'http',
    database: config.influxdb.database
}));
const cols = [
    'min(elapsed)', 'percentile(elapsed, 10) as p10', 'percentile(elapsed, 20) as p20', 'percentile(elapsed, 25) as p25',
    'percentile(elapsed, 30) as p30', 'percentile(elapsed, 40) as p40', 'percentile(elapsed, 50) as p50',
    'percentile(elapsed, 60) as p60', 'percentile(elapsed, 70) as p70', 'percentile(elapsed, 75) as p75',
    'percentile(elapsed, 80) as p80', 'percentile(elapsed, 90) as p90', 'max(elapsed)',
    'mean(elapsed)', 'stddev(elapsed)', 'last(elapsed) as lastObserved', 'sum(elapsed) as total', 'count(elapsed)',
    'count(distinct elapsed) as uniqs'
].join(',');
const fields = [
    {label: 'collectionOrRoute', value: (row) => row.collection || row.route}, 'method',
    {label: 'statusCodeOrType', value: (row) => row.statusCode || row.type || '#'},
    'min', 'p10', 'p20', 'p25', 'p30', 'p40', 'p50', 'p60', 'p70', 'p75', 'p80', 'p90', 'max',
    'mean', 'stddev', 'lastObserved', 'total', 'count', 'uniqs'
];
const queryOn = {
    dao: ['collection, method', 'collection', 'method'],
    controller: ['route', 'method', 'statusCode', 'route, method', 'route, statusCode', 'method, statusCode'],
    handler: ['collection', 'method', 'type', 'collection, method', 'collection, type', 'collection, method, type']
};
const queries = _.flatten(
    Object.keys(queryOn).map(measure =>
        queryOn[measure].map(grouping => `select ${cols} from ${measure} group by ${grouping}`)
    )
);
const json2Csv = (data) => json2csv({data, fields});
describe('perf', () => {
    it('should print out server performance stats', (done) => {
        Bluebird.all(queries.map(query => influxdb.queryAsync(query)))
            .then(_.flattenDeep)
            .then(json2Csv)
            .then(csv => csv.replace(/"null"/g, 0).replace(/"/g, ''))
            .then(console.log.bind(console))
            .then(() => done())
            .catch(err => done());
    });
});

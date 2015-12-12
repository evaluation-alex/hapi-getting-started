'use strict';
let exec = require('child_process').exec;
let opts = require('./../server/options.json');
let influxdb = opts.influxdb;
module.exports = function (gulp, $) {
    return function (cb) {
        const toExec = `${influxdb.shellCmd} -host '${influxdb.host}' -port ${influxdb.httpport} -database '${influxdb.database}' -execute 'create database ${influxdb.database}'`;
        exec(toExec, (err, stdout, stderr) => {
            $.gutil.log('[server:test:prep]' + stdout);
            $.gutil.log('[server:test:prep]' + stderr);
            if (err) {
                $.gutil.log('[server:test:prep]' + err);
            }
            cb();
        });
    }
};

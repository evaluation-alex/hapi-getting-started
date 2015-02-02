'use strict';
var Glue = require('glue');
var Manifest = require('./server/manifest');
var Loader = require('./server/common/component');

Glue.compose(Manifest.manifest, {relativeTo: __dirname}, function (err, server) {
    if (err) {
        throw err;
    }
    Loader.load(server, {basePath: '/api'}, Manifest.components);
    server.start(function () {
        console.log('engage');
    });
});


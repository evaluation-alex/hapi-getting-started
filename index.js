'use strict';
var Glue = require('glue');
var Manifest = require('./server/manifest').manifest;
var Components = require('./server/manifest').components;
var Loader = require('./server/common/component');

Glue.compose(Manifest, {relativeTo: __dirname}, function (err, server) {
    if (err) {
        throw err;
    }
    Loader.load(server, {basePath: '/api'}, Components);
    server.start(function () {
        console.log('engage');
    });
});


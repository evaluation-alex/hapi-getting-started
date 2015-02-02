'use strict';
var Glue = require('glue');
var Manifest = require('./server/manifest');

Glue.compose(Manifest.manifest, {relativeTo: __dirname}, function (err, server) {
    if (err) {
        throw err;
    }
    Manifest.components.forEach(function (component) {
        server.route(require(component).Routes);
    });
    server.start(function () {
        console.log('engage');
    });
});


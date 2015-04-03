'use strict';
let Glue = require('glue');
let Manifest = require('./server/manifest');

Glue.compose(Manifest.manifest, {relativeTo: __dirname}, (err, server) => {
    if (err) {
        throw err;
    }
    Manifest.components.forEach((component) => server.route(require(component)));
    server.start(() => console.log('engage'));
});

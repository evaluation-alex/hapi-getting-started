'use strict';
let Glue = require('glue');
let manifest = require('./config').manifest;
Glue.compose(manifest, {relativeTo: __dirname}, (err, server) => {
    if (err) {
        throw err;
    }
    server.start(() => console.log('engage'));
});

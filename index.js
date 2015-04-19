'use strict';
require('glue').compose(require('./config').manifest, {relativeTo: __dirname}, (err, server) => {
    if (err) {
        throw err;
    }
    server.start(() => console.log('engage'));
});

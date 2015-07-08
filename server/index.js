'use strict';
let Path = require('path');
require('glue').compose(require('./config').manifest, {relativeTo: Path.join(__dirname, '/../')}, (err, server) => {
    if (err) {
        throw err;
    }
    server.start(() => console.log('engage ' + JSON.stringify(server.info)));
});

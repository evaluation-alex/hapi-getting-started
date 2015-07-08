'use strict';
let _ = require('lodash');
let Bluebird = require('bluebird');
let Path = require('path');
module.exports.register = (server, options, next) => {
    server.dependency(_.flatten([options.dependencies, options.modules]), (srver, nxt) => {
        Bluebird.all(_.map(options.modules, (module) => require(Path.join(process.cwd(), '/server/', module, '/model')).ensureIndexes()))
            .then(() => undefined)
            .then(nxt, nxt)
            .done();
    });
    return next();
};
module.exports.register.attributes = {
    name: 'MongoIndexes'
};

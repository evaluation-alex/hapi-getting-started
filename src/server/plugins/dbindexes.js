'use strict';
const Bluebird = require('bluebird');
const path = require('path');
const register = function register(server, options, next) {
    Bluebird.all(
        options.modules
            .map(module => path.join(process.cwd(), '/build/server', module, '/model'))
            .map(model => require(model).createIndexes())
    )
    .then(() => undefined)
    .then(next, next);
};
register.attributes = {
    name: 'MongoIndexes'
};
module.exports = register;

'use strict';
import Bluebird from 'bluebird';
import path from 'path';
export let register = function register(server, options, next) {
    Bluebird.all(options.modules.map(module => {
        return require(path.join(process.cwd(), '/build/', module, '/model')).createIndexes();
    }))
        .then(() => undefined)
        .then(next, next);
};
register.attributes = {
    name: 'MongoIndexes'
};

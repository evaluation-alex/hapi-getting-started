'use strict';
import Bluebird from 'bluebird';
import path from 'path';
export let register = function register(server, options, next) {
    const prefix = path.join(process.cwd(), '/build/');
    Bluebird.all(options.modules.map(module => require(path.join(prefix, module, '/model')).createIndexes()))
        .then(() => undefined)
        .then(next, next);
};
register.attributes = {
    name: 'MongoIndexes'
};

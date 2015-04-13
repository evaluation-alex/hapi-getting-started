'use strict';
let Path = require('path');
let Model = require('./../model');
let _ = require('lodash');
module.exports.register = (server, options, next) => {
    let loadedModels = {};
    _.forIn(options.models, (file, model) => {
        loadedModels[model] = require(Path.join(process.cwd(), file));
    });
    Model.connect(options.mongodb)
        .then((db) => {
            server.expose('MongoDB', db);
            server.on('stop', () => Model.disconnect());
            return db;
        })
        .then(() => {
            if (options.autoIndex) {
                return Promise.all(_.map(_.values(loadedModels), (model) => model.ensureIndexes()));
            }
        })
        .then(() => {
            next();
        })
        .catch((err) => {
            next(err);
        })
        .done();
};
module.exports.register.attributes = {
    name: 'MongoModels'
};

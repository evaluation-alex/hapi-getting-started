'use strict';
let Path = require('path');
let Model = require('./../model');
let _ = require('lodash');
module.exports.register = (server, options, next) => {
    let loadedModels = {};
    _.forIn(options.models, (file, model) => {
        loadedModels[model] = require(Path.join(process.cwd(), file));
    });
    let dbconnections = [];
    _.forIn(options.connections, (connectionargs, name) => {
        dbconnections.push(Model.connect(name, connectionargs)
            .then((db) => {
                server.expose('MongoDB' + name, db);
                server.on('stop', () => Model.disconnect(name));
                return db;
            }));
    });
    Promise.all(dbconnections)
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
        });
};
module.exports.register.attributes = {
    name: 'MongoModels'
};

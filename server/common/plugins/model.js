'use strict';
let Path = require('path');
let Model = require('./../model');
let _ = require('lodash');
let Bluebird = require('bluebird');
module.exports.register = (server, options, next) => {
    let dbconnections = [];
    _.forIn(options.connections, (connectionargs, name) => {
        dbconnections.push(Model.connect(name, connectionargs)
            .then((db) => {
                server.expose('MongoDB' + name, db);
                server.on('stop', () => Model.disconnect(name));
                return db;
            }));
    });
    Bluebird.all(dbconnections)
        .then(() => {
            return Bluebird.all(_.map(options.models, (model) => {
                let loadedmodel = require(Path.join(process.cwd(), model));
                if (options.autoIndex) {
                    return loadedmodel.ensureIndexes();
                }
            }));
        })
        .then(() => undefined)
        .then(next, next);
};
module.exports.register.attributes = {
    name: 'MongoModels'
};

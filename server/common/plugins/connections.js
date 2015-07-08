'use strict';
let Model = require('./../model');
let _ = require('lodash');
let Bluebird = require('bluebird');
module.exports.register = (server, options, next) => {
    let dbconnections = [];
    _.forIn(options.mongo, (connectionargs, name) => {
        dbconnections.push(Model.connect(name, connectionargs)
            .then((db) => {
                server.expose('MongoDB' + name, db);
                server.on('stop', () => {
                    Model.disconnect(name);
                });
                return db;
            }));
    });
    Bluebird.all(dbconnections)
        .then(() => undefined)
        .then(next, next)
        .done();
};
module.exports.register.attributes = {
    name: 'MongoConnections'
};

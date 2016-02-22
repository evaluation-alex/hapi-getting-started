'use strict';
const _ = require('./../lodash');
const Bluebird = require('bluebird');
const dao = require('./../common/dao');
const {forIn} = _;
const {connect, disconnect} = dao;
const register = function register(server, options, next) {
    const dbconnections = [];
    forIn(options.mongo, (connectionargs, name) => {
        dbconnections.push(connect(name, connectionargs)
            .then(db => {
                server.expose(`MongoDB${name}`, db);
                server.on('stop', () => {
                    disconnect(name);
                });
                return db;
            }));
    });
    Bluebird.all(dbconnections)
        .then(() => undefined)
        .then(next, next);
};
register.attributes = {
    name: 'MongoConnections'
};
module.exports = register;

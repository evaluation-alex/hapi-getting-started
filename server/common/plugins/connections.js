'use strict';
import {forIn} from 'lodash';
import Bluebird from 'bluebird';
import {connect, disconnect} from './../dao';
export let register = function register(server, options, next) {
    const dbconnections = [];
    forIn(options.mongo, (connectionargs, name) => {
        dbconnections.push(connect(name, connectionargs)
            .then(db => {
                server.expose('MongoDB' + name, db);
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

'use strict';
let Path = require('path');
let Model = require('./../model');
let _ = require('lodash');
let utils = require('./../utils');
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
        .then((db) => {
            if (options.autoIndex) {
                _.forEach(_.values(loadedModels), (model) => {
                    _.forEach(model.indexes, (index) => {
                        db.ensureIndex(model.collection,
                            index[0],
                            index[1] || {},
                            utils.defaultcb('ensureIndex', _.noop, _.noop));
                    });
                });
            }
        })
        .done(next, next);
};
module.exports.register.attributes = {
    name: 'MongoModels'
};

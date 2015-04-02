'use strict';
var Path = require('path');
var Model = require('./../model');
var _ = require('lodash');
var utils = require('./../utils');
module.exports.register = function (server, options, next) {
    var loadedModels = {};
    _.forIn(options.models, function (file, model) {
        loadedModels[model] = require(Path.join(process.cwd(), file));
    });
    Model.connect(options.mongodb)
        .then(function (db) {
            server.expose('MongoDB', db);
            server.on('stop', function () {
                Model.disconnect();
            });
            return db;
        })
        .then(function (db) {
            if (options.autoIndex) {
                _.forEach(_.values(loadedModels), function (model) {
                    _.forEach(model.indexes, function (index) {
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

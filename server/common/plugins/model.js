'use strict';
var Path = require('path');
var Model = require('./../model');
var _ = require('lodash');
module.exports.register = function (server, options, next) {
    var models = options.models || {};
    var loadedModels = {};
    var mongodb = options.mongodb;
    _.forIn(models, function (file, model) {
        loadedModels[model] = require(Path.join(process.cwd(), file));
    });
    Model.connect(mongodb)
        .then(function (db) {
            server.expose('MongoDB', db);
            return db;
        })
        .then(function (db) {
            if (options.autoIndex) {
                _.forEach(_.values(loadedModels), function (model) {
                    _.forEach(model.indexes, function (index) {
                        try {
                            db.ensureIndex(model.collection, index[0], index[1] || {}, function (err, res) {
                                if (err) {
                                    console.log(err, err.stack);
                                }
                                res;
                            });
                        } catch (err) {
                            console.log(err, err.stack);
                        }
                    });
                });
            }
            return;
        })
        .done(next, next);
};
module.exports.register.attributes = {
    name: 'MongoModels'
};

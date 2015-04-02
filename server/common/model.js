'use strict';
var Joi = require('joi');
var Mongodb = require('mongodb');
var utils = require('./utils');
var Promise = require('bluebird');
var _ = require('lodash');
var Model = function Model () {
};
Model.ObjectId = Model.ObjectID = Mongodb.ObjectID;
Model.connect = function connect (config) {
    return new Promise(function (resolve, reject) {
        Mongodb.MongoClient.connect(config.url, config.options, utils.defaultcb('connect', function (db) {
            Model.db = db;
            resolve(db);
        }, reject));
    });
};
Model.disconnect = function disconnect () {
    Model.db.close();
};
Model.validate = function validate (input) {
    var self = this;
    return new Promise(function (resolve, reject) {
        return Joi.validate(input, self.schema, utils.defaultcb(self.collection + '.validate', resolve, reject));
    });
};
Model.count = function count (query) {
    var self = this;
    var collection = Model.db.collection(self.collection);
    return new Promise(function (resolve, reject) {
        collection.count(query, utils.defaultcb(self.collection + '.count', resolve, reject));
    });
};
Model.find = function find (query, fields, sort, limit, skip) {
    var self = this;
    var collection = Model.db.collection(self.collection);
    return new Promise(function (resolve, reject) {
        var opts = {fields: fields, sort: sort, limit: limit, skip: skip};
        collection.find(query, opts).toArray(utils.defaultcb(self.collection + '.find', function (docs) {
            if (utils.hasItems(docs)) {
                resolve(_.map(docs, function (doc) {
                    /*jshint -W055*/
                    return new self(doc);
                    /*jshint +W055*/
                }));
            } else {
                resolve([]);
            }
        }, reject));
    });
};
Model.findOne = function findOne (query) {
    var self = this;
    var collection = Model.db.collection(self.collection);
    return new Promise(function (resolve, reject) {
        collection.findOne(query, {}, utils.defaultcb(self.collection + '.findOne', function (doc) {
            /*jshint -W055*/
            resolve(doc ? new self(doc) : undefined);
            /*jshint +W055*/
        }, reject));
    });
};
Model.pagedFind = function pagedFind (query, fields, sort, limit, page) {
    var self = this;
    return Promise.join(self.find(query, fields, sort, limit, (page - 1) * limit), self.count(query), function (results, count) {
        var output = {
            data: results,
            pages: {
                current: page,
                prev: page - 1,
                hasPrev: ((page - 1) !== 0),
                next: page + 1,
                hasNext: ((page + 1) <= Math.ceil(count / limit)),
                total: Math.ceil(count / limit)
            },
            items: {
                limit: limit,
                begin: Math.min(count, ((page * limit) - limit) + 1),
                end: Math.min(count, page * limit),
                total: count
            }
        };
        return output;
    });
};
Model.insert = Model.update = Model.save = Model.upsert = function upsert (obj) {
    var self = this;
    var collection = Model.db.collection(self.collection);
    return new Promise(function (resolve, reject) {
        obj._id = obj._id || Mongodb.ObjectID();
        collection.findOneAndReplace({_id: obj._id}, obj, {
            upsert: true,
            returnOriginal: false
        }, utils.defaultcb(self.collection + '.save', function (doc) {
            if (doc) {
                /*jshint -W055*/
                resolve(new self(doc.value));
                /*jshint +W055*/
            } else {
                resolve(undefined);
            }
        }, reject));
    });
};
Model.remove = Model.delete = function remove (query) {
    var self = this;
    var collection = Model.db.collection(self.collection);
    return new Promise(function (resolve, reject) {
        collection.deleteMany(query, utils.defaultcb(self.collection + '.remove', function (doc) {
            resolve(doc.deletedCount);
        }, reject));
    });
};
module.exports = Model;

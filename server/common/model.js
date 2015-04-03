'use strict';
let Mongodb = require('mongodb');
let utils = require('./utils');
var Promise = require('bluebird');
let _ = require('lodash');
var Model = function Model () {
};
Model.ObjectId = Model.ObjectID = Mongodb.ObjectID;
Model.connect = (config) => {
    return new Promise((resolve, reject) => {
        Mongodb.MongoClient.connect(config.url,
            config.options,
            utils.defaultcb('connect',
                (db) => {
                    Model.db = db;
                    resolve(db);
                },
                reject));
    });
};
Model.disconnect = () => {
    Model.db.close();
};
Model.count = (query) => {
    let self = this;
    let collection = Model.db.collection(self.collection);
    return new Promise((resolve, reject) => {
        collection.count(query,
            utils.defaultcb(self.collection + '.count',
                resolve,
                reject,
                query));
    });
};
Model.find = (query, fields, sort, limit, skip) => {
    let self = this;
    let collection = Model.db.collection(self.collection);
    return new Promise((resolve, reject) => {
        collection.find(query,
            {fields: fields, sort: sort, limit: limit, skip: skip}
        ).toArray(utils.defaultcb(self.collection + '.find',
                (docs) => {
                    if (utils.hasItems(docs)) {
                        /*jshint -W055*/
                        resolve(_.map(docs, (doc) => new self(doc)));
                        /*jshint +W055*/
                    } else {
                        resolve([]);
                    }
                },
                reject,
                query)
        );
    });
};
Model.findOne = (query) => {
    let self = this;
    let collection = Model.db.collection(self.collection);
    return new Promise((resolve, reject) => {
        /*jshint -W055*/
        collection.findOne(query,
            {},
            utils.defaultcb(self.collection + '.findOne',
                (doc) => resolve(doc ? new self(doc) : undefined),
                reject,
                query)
        );
        /*jshint +W055*/
    });
};
Model.pagedFind = (query, fields, sort, limit, page) => {
    let self = this;
    return Promise.join(
        self.find(query, fields, sort, limit, (page - 1) * limit),
        self.count(query),
        (results, count) => {
            return {
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
        });
};
Model.insert = Model.update = Model.save = Model.upsert = (obj) => {
    let self = this;
    let collection = Model.db.collection(self.collection);
    return new Promise((resolve, reject) => {
        obj._id = obj._id || self.ObjectID();
        /*jshint -W055*/
        collection.findOneAndReplace({_id: obj._id},
            obj,
            {upsert: true, returnOriginal: false},
            utils.defaultcb(self.collection + '.upsert',
                (doc) => resolve(doc ? new self(doc.value) : undefined),
                reject)
        );
        /*jshint +W055*/
    });
};
Model.remove = Model.delete = (query) => {
    let self = this;
    let collection = Model.db.collection(self.collection);
    return new Promise((resolve, reject) => {
        collection.deleteMany(query,
            utils.defaultcb(self.collection + '.remove',
                (doc) => resolve(doc.deletedCount),
                reject,
                query)
        );
    });
};
module.exports = Model;

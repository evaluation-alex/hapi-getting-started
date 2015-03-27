'use strict';
var Joi = require('joi');
var Mongodb = require('mongodb');
var utils = require('./utils');
var Promise = require('bluebird');
var _ = require('lodash');
var Hoek = require('hoek');

var Model = function model () {
};

Model.ObjectId = Model.ObjectID = Mongodb.ObjectID;

Model.connect = function connect (config) {
    var self = this;
    return new Promise(function (resolve, reject) {
        Mongodb.MongoClient.connect(config.url, config.settings, utils.defaultcb(self._collection + '.connect', function (db) {
            Model.db = db;
            resolve(db);
        }), reject);
    });
};

Model.disconnect = function disconnect () {
    Model.db.close();
};

Model.validate = function validate (input) {
    var self = this;
    return new Promise(function (resolve, reject) {
        return Joi.validate(input, self.schema, utils.defaultcb(self._collection + '.validate', resolve, reject));
    });
};

Model.prototype.validate = function validate () {
    var self = this;
    return new Promise(function (resolve, reject) {
        return Joi.validate(self, self.constructor.schema, utils.defaultcb(self.constructor._collection + '.validate', resolve, reject));
    });
};

var fieldsAdapter = function fieldsAdapter (fields) {
    if (Object.prototype.toString.call(fields) === '[object String]') {
        var document = {};
        fields = fields.split(/\s+/);
        fields.forEach(function (field) {
            if (field) {
                document[field] = true;
            }
        });
        fields = document;
    }
    return fields;
};

var sortAdapter = function sortAdapter (sorts) {
    if (Object.prototype.toString.call(sorts) === '[object String]') {
        var document = {};
        sorts = sorts.split(/\s+/);
        sorts.forEach(function (sort) {
            if (sort) {
                var order = sort[0] === '-' ? -1 : 1;
                if (order === -1) {
                    sort = sort.slice(1);
                }
                document[sort] = order;
            }
        });
        sorts = document;
    }
    return sorts;
};

Model._count = function count (query) {
    var self = this;
    var collection = Model.db.collection(self._collection);
    return new Promise(function (resolve, reject) {
        collection.count(query, utils.defaultcb(self._collection + '.count', resolve, reject));
    });
};

Model._find = function find (query, sort, fields, limit, skip) {
    var self = this;
    var collection = Model.db.collection(self._collection);
    return new Promise(function (resolve, reject) {
        fields = fieldsAdapter(fields);
        sort = sortAdapter(Hoek.applyToDefaults(sort, {'_id': 1}));
        var opts = Hoek.applyToDefaults({}, {
            fields: fields, limit: limit, skip: skip
        });
        collection.find(query, opts).sort(sort).toArray(utils.defaultcb(self._collection + '.find', function (docs) {
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

Model._findOne = function findOne (query) {
    var self = this;
    var collection = Model.db.collection(self._collection);
    return new Promise(function (resolve, reject) {
        collection.findOne(query, {}, utils.defaultcb(self._collection + '.findOne', function (doc) {
            if (doc) {
                /*jshint -W055*/
                resolve(new self(doc));
                /*jshint +W055*/
            } else {
                resolve(undefined);
            }
        }, reject));
    });
};

Model._findById = function findById (id) {
    return Model.findOne({_id: Mongodb.ObjectID(id)});
};

Model._pagedFind = function pagedFind (query, fields, sort, limit, page) {
    var self = this;
    return Promise.join(self._find(query, fields, limit, (page - 1) * limit), self._count(query), function (results, count) {
        var output = {
            data: results,
            pages: {
                current: page,
                prev: page - 1,
                hasPrev: ((page - 1) !== 0),
                next: page + 1,
                hasNext: ((page + 1) <= count),
                total: Math.ceil(count / limit)
            },
            items: {
                limit: limit,
                begin: ((page * limit) - limit) + 1,
                end: page * limit,
                total: count
            }
        };
        if (output.items.begin > output.items.total) {
            output.items.begin = output.items.total;
        }
        if (output.items.end > output.items.total) {
            output.items.end = output.items.total;
        }
        return output;
    });
};

Model._save = function save (obj) {
    var self = this;
    var collection = Model.db.collection(self._collection);
    return new Promise(function (resolve, reject) {
        if (!obj._id) {
            obj._id = Mongodb.ObjectID();
        }
        collection.findOneAndReplace({_id: obj._id}, obj, {
            upsert: true,
            returnOriginal: false
        }, utils.defaultcb(self._collection + '.save', function (doc) {
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

Model.remove = function remove (query, cb) {
    var self = this;
    var collection = Model.db.collection(self._collection);
    collection.deleteMany(query, cb);
};

module.exports = Model;

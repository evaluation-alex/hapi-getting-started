'use strict';
var BaseModel = require('hapi-mongo-models').BaseModel;
var ObjectAssign = require('object-assign');
var Promise = require('bluebird');

var ExtendedModel = BaseModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});

ExtendedModel._find = function (conditions) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.find(conditions, function (err, res) {
            if (err) {
                reject(err);
            } else {
                if (!res) {
                    reject(new Error('docs not found for conditions - ' + JSON.stringify(conditions)));
                } else {
                    resolve(res);
                }
            }
        });
    });
};

ExtendedModel._findOne = function (conditions) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.findOne(conditions, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                resolve(doc);
            }
        });
    });
};

ExtendedModel._findByIdAndUpdate = function (id, obj) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.findByIdAndUpdate(id, obj, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                resolve(obj);
            }
        });
    });
};

ExtendedModel._count = function(query) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.count(query, function (err, count) {
            if (err) {
                reject (err);
            } else {
                resolve(count);
            }
        });
    });
};

ExtendedModel._insert = function(document, notCreated) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.insert(document, function (err, docs) {
            if (err) {
                reject(err);
            } else {
                if (!docs) {
                    resolve(notCreated);
                } else {
                    resolve(docs[0]);
                }
            }
        });
    });
};

module.exports.ExtendedModel = ExtendedModel;
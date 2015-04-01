'use strict';
var Promise = require('bluebird');
var utils = require('./../utils');
var _ = require('lodash');

module.exports = function promisify (Model, toPromisify) {
    //['find', 'findOne', 'count', 'pagedFind', 'findOneAndReplace', 'insertOne']
    _.forEach(toPromisify, function (method) {
        Model['_' + method] = function () {
            var self = this;
            //[].slice.call(arguments) is a optimization killer per bluebird docs
            //https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments
            var args = new Array(arguments.length);
            for (var i = 0; i < args.length; ++i) {
                args[i] = arguments[i];
            }
            return new Promise(function (resolve, reject) {
                args.push(utils.defaultcb(self._collection + '.' + method, resolve, reject));
                self[method].apply(self, args);
            });
        };
    }, Model);
};

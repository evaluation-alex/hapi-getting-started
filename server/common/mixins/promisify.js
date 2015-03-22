'use strict';
var Promise = require('bluebird');
var utils = require('./../utils');
var _ = require('lodash');

module.exports = function promisify (Model, toPromisify) {
    //['find', 'findOne', 'count', 'pagedFind', 'findByIdAndUpdate', 'insert']
    _.forEach(toPromisify, function (method) {
        Model['_' + method] = function () {
            var self = this;
            var args = [].slice.call(arguments);
            return new Promise(function (resolve, reject) {
                args.push(utils.defaultcb(self._collection + '.' + method, resolve, reject));
                self[method].apply(self, args);
            });
        };
        Model['_' + method].name = '_' + method;
    }, Model);
};

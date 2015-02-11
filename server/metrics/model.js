'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var Promise = require('bluebird');
var Moment = require('moment');

var Metrics = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});

Metrics._collection = 'metrics';
Metrics.schema = Joi.object().keys({
    _id: Joi.object(),
    requestid: Joi.string(),
    host: Joi.string(),
    path: Joi.string(),
    method: Joi.string(),
    statusCode: Joi.number(),
    received: Joi.date(),
    responded: Joi.date(),
    elapsed: Joi.number(),
    headers: Joi.object(),
    orig: Joi.object(),
    remoteAddress: Joi.string(),
    remotePort: Joi.string()
});

Metrics.indexes = [
    [{path: 1, method: 1, statusCode: 1}],
    [{remoteAddress: 1}]
];

var normalizePath = function (path) {
    path = (path.indexOf('/') === 0) ? path.substr(1) : path;
    return path.replace(/\//g, '_');
};

Metrics.create = function (request) {
    var self = this;
    var requestid = request.id;
    var host = request.info.host;
    var path = normalizePath(request._route.path);
    var specials = request.connection._router.specials;
    if (request._route === specials.notFound.route) {
        path = '/{notFound*}';
    }  else if (specials.options && request._route === specials.options.route) {
        path = '/{cors*}';
    }
    var method = request.method;
    var statusCode = (request.response.isBoom) ? request.response.output.statusCode : request.response.statusCode;
    var received = new Date(request.info.received);
    var responded = new Date(request.info.responded === 0 ? Date.now() : request.info.responded);
    var elapsed = Moment(responded).diff(Moment(received));
    var headers = request.headers;
    var orig = request.orig;
    var remoteAddress = request.info.remoteAddress;
    var remotePort = request.info.remotePort;

    var doc = {
        requestid: requestid,
        host: host,
        path: path,
        method: method,
        statusCode: statusCode,
        received: received,
        responded: responded,
        elapsed: elapsed,
        headers: headers,
        orig: orig,
        remoteAddress: remoteAddress,
        remotePort: remotePort
    };
    return self._insert(doc, false);
};

module.exports = Metrics;

'use strict';
var Boom = require('boom');
var logger = require('./../../config').logger;

var logAndReject = function(err, reject) {
    logger.error({error: err});
    reject(err);
};

module.exports.logAndReject = logAndReject;

var logAndBoom = function (err, reply) {
    logger.error({error: err});
    reply(Boom.badImplementation(err));
};

module.exports.logAndBoom = logAndBoom;

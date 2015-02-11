'use strict';
var Metrics = require('./../metrics/model');

module.exports.register = function (server, options, next) {
    server.ext('onRequest', function (request, reply) {
        return reply.continue();
    });
    server.ext('onPreResponse', function (request, reply) {
        Metrics.create(request);
        return reply.continue();
    });
    next();
};
module.exports.register.attributes = {
    name: 'metrics'
};
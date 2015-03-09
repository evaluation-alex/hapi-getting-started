'use strict';
var UserAgent = require('useragent');
var utils = require('./utils');

var normalizePath = function normalizePath (request) {
    var specials = request.connection._router.specials;
    if (request._route === specials.notFound.route) {
        return 'notFound*';
    } else if (specials.options && request._route === specials.options.route) {
        return 'cors*';
    } else {
        return request._route.path.slice(1).replace(/\//g, '.').replace(/{/g, '').replace(/}/g, '');
    }
};

module.exports.register = function register (server, options, next) {
    server.on('tail', function gatherPerfStats (request) {
        var ua = UserAgent.lookup(request.headers['user-agent']);
        utils.toStatsD(normalizePath(request) + '.' + request.method.toUpperCase(),
            '.' + request.response.statusCode,
            request.auth.credentials ? request.auth.credentials.user.email : 'notloggedin',
            ua.device.toString(),
            ua.toString(),
            request.info.received,
            request.info.responded);
    });
    next();
};

module.exports.register.attributes = {
    name: 'metrics'
};


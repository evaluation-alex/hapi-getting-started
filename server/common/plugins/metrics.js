'use strict';
var UserAgent = require('useragent');
var utils = require('./../utils');

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

var gatherPerfStats = function gatherPerfStats (request) {
    var ua = UserAgent.lookup(request.headers['user-agent']);
    var path = normalizePath(request) + '.' + request.method.toUpperCase();
    var statusCode = '.' + request.response.statusCode;
    var user = request.auth.credentials ? request.auth.credentials.user.email : 'notloggedin';
    var device = ua.device.toString();
    var browser = ua.toString();
    var start = request.info.received;
    var end = request.info.responded;
    process.nextTick(function() {
        utils.toStatsD(path,
            statusCode,
            user,
            device,
            browser,
            start,
            end);
    });
};

module.exports.register = function register (server, options, next) {
    server.on('tail', gatherPerfStats);
    next();
};

module.exports.register.attributes = {
    name: 'metrics'
};


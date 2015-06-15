'use strict';
let UserAgent = require('useragent');
let utils = require('./../utils');
let normalizePath = (request) => {
    const specials = request.connection._router.specials;
    if (request._route === specials.notFound.route) {
        return 'notFound*';
    } else if (specials.options && request._route === specials.options.route) {
        return 'cors*';
    } else {
        return request._route.path.slice(1).replace(/\//g, '.').replace(/{/g, '').replace(/}/g, '');
    }
};
let gatherPerfStats = (request) => {
    let ua = UserAgent.lookup(request.headers['user-agent']);
    const path = normalizePath(request) + '.' + request.method.toUpperCase();
    const statusCode = '.' + request.response.statusCode;
    const user = utils.by(request);
    const device = ua.device.toString();
    const browser = ua.toString();
    const start = request.info.received;
    const end = request.info.responded;
    process.nextTick(() => {
        utils.toStatsD(path,
            statusCode,
            user,
            device,
            browser,
            start,
            end);
    });
};
module.exports.register = (server, options, next) => {
    server.on('tail', gatherPerfStats);
    next();
};
module.exports.register.attributes = {
    name: 'metrics'
};

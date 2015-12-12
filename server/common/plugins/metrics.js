'use strict';
const UserAgent = require('useragent');
const {by, timing} = require('./../utils');
function normalizePath(request) {
    const specials = request.connection._router.specials;
    if (request._route === specials.notFound.route) {
        return 'notFound*';
    } else if (specials.options && request._route === specials.options.route) {
        return 'cors*';
    } else {
        return request._route.path.slice(1).replace(/\//g, '.').replace(/{/g, '').replace(/}/g, '');
    }
}
const register = function register(server, options, next) {
    server.on('tail', request => {
        const ua = UserAgent.lookup(request.headers['user-agent']);
        const tags = {
            route: normalizePath(request),
            method: request.method.toUpperCase(),
            userid: by(request),
            statusCode: `#${request.response.statusCode}`
        };
        const fields = {
            device: ua.device.toString(),
            browser: ua.toString(),
            elapsed: request.info.responded - request.info.received
        };
        timing('controller', tags, fields);
    });
    return next();
};
register.attributes = {
    name: 'metrics'
};
module.exports = register;

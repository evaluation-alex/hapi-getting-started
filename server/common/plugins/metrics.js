'use strict';
import UserAgent from 'useragent';
import {by, timing} from './../utils';
function gatherStats(route, statusCode, user, device, browser, start, finish) {
    let elapsed = finish - start;
    process.nextTick(() => {
        timing('controller', user, elapsed);
        timing('controller', user + '|' + device + '|' + browser, elapsed);
        timing('controller', route, elapsed);
        timing('controller', route + statusCode, elapsed);
    });
}
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
export let register = function register(server, options, next) {
    server.on('tail', request => {
        const ua = UserAgent.lookup(request.headers['user-agent']);
        const path = normalizePath(request) + '.' + request.method.toUpperCase();
        const statusCode = '.' + request.response.statusCode;
        const user = by(request);
        const device = ua.device.toString();
        const browser = ua.toString();
        const start = request.info.received;
        const end = request.info.responded;
        gatherStats(path, statusCode, user, device, browser, start, end);
    });
    return next();
};
register.attributes = {
    name: 'metrics'
};

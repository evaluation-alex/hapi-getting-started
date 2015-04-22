'use strict';
let UserAgent = require('useragent');
module.exports.register = (server, options, next) => {
    server.route({
        method: 'GET',
        path: '/hello',
        handler: (request, reply) => {
            let ua = UserAgent.lookup(request.headers['user-agent']);
            console.log('hello called');
            reply({
                device: ua.device.toString(),
                browser: ua.toString(),
                params: request.params,
                query: request.query
            });
        }
    });
    next();
};
module.exports.register.attributes = {
    name: 'hello'
};

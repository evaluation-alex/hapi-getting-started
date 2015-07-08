'use strict';
module.exports.register = (server, options, next) => {
    server.route({
        method: 'GET',
        path: '/public/{param*}',
        handler: {
            directory: {
                path: 'public',
                listing: true
            }
        }
    });
    return next();
};
module.exports.register.attributes = {
    name: 'public'
};

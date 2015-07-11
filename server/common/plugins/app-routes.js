'use strict';
let _ = require('lodash');
let Path = require('path');
module.exports.register = (server, options, next) => {
    _.forEach(options.modules, (module) => {
        _.forEach(require(Path.join(process.cwd(), '/server/' + module, '/routes')), (route) => {
            route.path = options.prependRoute + route.path;
            server.route(route);
        });
    });
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
    name: 'AppRoutes'
};

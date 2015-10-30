'use strict';
import path from 'path';
import {functions} from 'lodash';
import fs from 'fs';
function describeRoutes(routes) {
    routes.forEach(route => {
        console.log(`${route.method}  ${route.path}`);
    });
}
function describeModel(model) {
    if (fs.existsSync(model + '.js')) {
        let modl = require(model);
        console.log(`class: ${modl.name}`);
        const staticMethods = functions(modl).join('\n\t');
        console.log(`static methods: ${staticMethods}`);
        const protoMethods = functions(modl.prototype).join('\n\t');
        console.log(`prototype methods: ${protoMethods}`);
    }
}

export let register = function register(server, options, next) {
    options.modules.forEach(module => {
        let basePath = path.join(process.cwd(), '/build/', module);
        let model = path.join(basePath, '/model');
        let routes = require(path.join(basePath, '/routes'));
        /*istanbul ignore if*/
        /*istanbul ignore else*/
        if (process.env.NODE_ENV !== 'production') {
            describeModel(model);
            describeRoutes(routes);
        }
        routes.forEach(route => {
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
register.attributes = {
    name: 'AppRoutes'
};

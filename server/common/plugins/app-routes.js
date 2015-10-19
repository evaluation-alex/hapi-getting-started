'use strict';
import path from 'path';
import {functions} from 'lodash';
import fs from 'fs';
function describeRoutes(routes) {
    /*istanbul ignore if*/
    if (process.env.NODE_ENV !== 'production') {
        routes.forEach(route => {
            console.log(`${route.method}  ${route.path}`);
        });
    }
}
function describeModel(model) {
    /*istanbul ignore if*/
    if (process.env.NODE_ENV !== 'production') {
        if (fs.existsSync(model + '.js')) {
            let modl = require(model);
            console.log(`class: ${modl.name}`);
            const staticMethods = functions(modl).join('\n\t');
            console.log(`static methods: ${staticMethods}`);
            const protoMethods = functions(modl.prototype).join('\n\t');
            console.log(`prototype methods: ${protoMethods}`);
        }
    }
}

export let register = function register(server, options, next) {
    options.modules.forEach(module => {
        describeModel(path.join(process.cwd(), '/build/', module, '/model'));
        let routes = require(path.join(process.cwd(), '/build/', module, '/routes'));
        routes.forEach(route => {
            route.path = options.prependRoute + route.path;
            server.route(route);
        });
        describeRoutes(routes);
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

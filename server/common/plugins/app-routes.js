'use strict';
import path from 'path';
import {functions} from 'lodash';
import fs from 'fs';
function describeRoutes(routes) {
    return routes.map(route => `${route.method}  ${route.path}`).join('\n');
}
function describeModel(model) {
    if (fs.existsSync(model + '.js')) {
        const modl = require(model);
        return `class: ${modl.name}
static methods:
    ${functions(modl).join('\n\t')}
prototype methods:
    ${functions(modl.prototype).join('\n\t')}`;
    }
    return '';
}

export let register = function register(server, options, next) {
    const buildPath = path.join(process.cwd(), '/build/');
    options.modules.forEach(module => {
        const model = path.join(buildPath, module, '/model');
        const routes = require(path.join(buildPath, module, '/routes'));
        /*istanbul ignore if*/
        /*istanbul ignore else*/
        if (process.env.NODE_ENV !== 'production') {
            console.log(
`${describeModel(model)}
${describeRoutes(routes)}`
            );
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

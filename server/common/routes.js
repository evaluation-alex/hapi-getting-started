'use strict';
const {filter, merge} = require('lodash');
function path(pathPrefix, component) {
    return `${pathPrefix}/${component}`;
}
function pathWithId(pathPrefix, component) {
    return `${pathPrefix}/${component}/{id}`;
}
const buildRoute = function buildRoute(method, path, controller, strategy = 'simple') {
    const {handler, validate, pre, post} = controller;
    return {
        method,
        path,
        handler,
        config: {
            auth: strategy ? {strategy} : !!strategy,
            //http://stackoverflow.com/questions/33526978/hapi-lab-how-to-test-all-the-required-fields
            validate: merge({}, {options: {abortEarly: false}}, validate),
            pre,
            ext: {
                onPostHandler: post
            }
        }
    };
};
module.exports.buildRoute = buildRoute;
module.exports.buildRESTRoutes = function buildRESTRoutes(component, controller, pathPrefix = '') {
    const restMethods = [
        {method: 'new', args: ['POST', path(pathPrefix, component), controller.new]},
        {method: 'find', args: ['GET', path(pathPrefix, component), controller.find]},
        {method: 'findOne', args: ['GET', pathWithId(pathPrefix, component), controller.findOne]},
        {method: 'update', args: ['PUT', pathWithId(pathPrefix, component), controller.update]},
        {method: 'delete', args: ['DELETE', pathWithId(pathPrefix, component), controller.delete]}
    ];
    return filter(restMethods.map(rest => controller[rest.method] ? buildRoute(...rest.args) : undefined));
};
module.exports.buildRoutesForMethods = function buildRoutesForMethods(methods, component, controller, pathPrefix = '') {
    return methods.map(action =>
        buildRoute('PUT', `${pathWithId(pathPrefix, component)}/${action}`, controller[action])
    );
};

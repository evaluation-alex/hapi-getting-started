'use strict';
const _ = require('./../lodash');
const {merge} = _;
const path = function path(...args) {
    return ('/' + args.join('/')).replace(/\/\//g, '/');
};
const buildRoute = function buildRoute(method, path, controller, strategy = 'simple') {
    const {handler, validate, pre, post, notes} = controller;
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
            },
            notes
        }
    };
};
const buildRESTRoutes = function buildRESTRoutes(component, controller) {
    if (controller.find) {
        controller.find.notes = ['POST is used instead of GET to overcome querystring limitations'];
    }
    const restMethods = [
        {method: 'new', args: ['POST', path(component), controller.new]},
        {method: 'find', args: ['POST', path(component, 'search'), controller.find]},
        {method: 'findOne', args: ['GET', path(component, '{id}'), controller.findOne]},
        {method: 'update', args: ['PUT', path(component, '{id}'), controller.update]},
        {method: 'delete', args: ['DELETE', path(component, '{id}'), controller.delete]}
    ];
    return restMethods.filter(rm => !!controller[rm.method]).map(rest => buildRoute(...rest.args));
};
const buildRoutesForMethods = function buildRoutesForMethods(methods, component, controller) {
    return methods.map(action =>
        buildRoute('PUT', path(component, '{id}', action), controller[action])
    );
};
module.exports = {
    buildRoute,
    buildRESTRoutes,
    buildRoutesForMethods
};

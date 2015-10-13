'use strict';
import {filter} from 'lodash';
const path = (pathPrefix, component) => ((pathPrefix ? pathPrefix : '') + '/' + component);
const pathWithId = (pathPrefix, component) => ((pathPrefix ? pathPrefix : '') + '/' + component + '/{id}');

export function buildRoute(method, path, controller, strategy = 'simple') {
    const {handler, validate, pre, post} = controller;
    const auth = strategy ? {strategy} : !!strategy;
    let route = {
        method,
        path,
        handler,
        config: {
            auth,
            validate,
            pre,
            ext: {
                onPostHandler: post
            }
        }
    };
    return route;
}
export function buildRESTRoutes(component, controller, pathPrefix) {
    const restMethods = [
        {method: 'new', args: ['POST', path(pathPrefix, component), controller.new]},
        {method: 'find', args: ['GET', path(pathPrefix, component), controller.find]},
        {method: 'findOne', args: ['GET', pathWithId(pathPrefix, component), controller.findOne]},
        {method: 'update', args: ['PUT', pathWithId(pathPrefix, component), controller.update]},
        {method: 'delete', args: ['DELETE', pathWithId(pathPrefix, component), controller.delete]}
    ];
    return filter(restMethods.map(rest => controller[rest.method] ? buildRoute(...rest.args) : undefined));
}
export function buildJoinApproveRejectLeaveRoutes(component, controller, pathPrefix) {
    return ['join', 'approve', 'reject', 'leave'].map(action =>
            buildRoute('PUT', pathWithId(pathPrefix, component) + '/' + action, controller[action])
    );
}

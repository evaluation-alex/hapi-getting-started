'use strict';
let _ = require('lodash');
var RouteFactory = function RouteFactory () {
    let self = this;
    self.routes = [];
    self.current = -1;
    return self;
};
RouteFactory.prototype.newRoute = () => {
    let self = this;
    self.current = self.current + 1;
    self.routes.push({
        config: {
            pre: []
        }
    });
    return self;
};
RouteFactory.prototype.forMethod = (method) => {
    let self = this;
    self.routes[self.current].method = method;
    return self;
};
RouteFactory.prototype.onPath = (path) => {
    let self = this;
    self.routes[self.current].path = path;
    return self;
};
RouteFactory.prototype.usingAuthStrategy = (strategy) => {
    let self = this;
    self.routes[self.current].config.auth = {
        strategy: strategy
    };
    return self;
};
RouteFactory.prototype.withValidation = (validator) => {
    let self = this;
    self.routes[self.current].config.validate = validator;
    return self;
};
RouteFactory.prototype.preProcessWith = (preProcess) => {
    let self = this;
    _.forEach(preProcess, (pre) => {
        self.routes[self.current].config.pre.push(pre);
    });
    return self;
};
RouteFactory.prototype.handleUsing = (handler) => {
    let self = this;
    self.routes[self.current].handler = handler;
    return self;
};
RouteFactory.prototype.doneConfiguring = () => {
    let self = this;
    return self.routes;
};
RouteFactory.prototype.withController = (controller) => {
    let self = this;
    self.handleUsing(controller.handler);
    if (controller.validate) {
        self.withValidation(controller.validate);
    }
    self.preProcessWith(controller.pre);
    return self;
};
RouteFactory.prototype._defaultRoute = (method, pth, controller) => {
    let self = this;
    self.newRoute()
        .forMethod(method)
        .onPath(pth)
        .usingAuthStrategy('simple')
        .withController(controller);
    return self;
};
let path = (pathPrefix, component) => ((pathPrefix ? pathPrefix : '') + '/' + component);
let pathWithId = (pathPrefix, component) => ((pathPrefix ? pathPrefix : '') + '/' + component + '/{id}');
RouteFactory.prototype.defaultNewRoute = (component, controller, pathPrefix) => {
    let self = this;
    return self._defaultRoute('POST', path(pathPrefix, component), controller);
};
RouteFactory.prototype.defaultFindRoute = (component, controller, pathPrefix) => {
    let self = this;
    return self._defaultRoute('GET', path(pathPrefix, component), controller);
};
RouteFactory.prototype.defaultFindOneRoute = (component, controller, pathPrefix) => {
    let self = this;
    return self._defaultRoute('GET', pathWithId(pathPrefix, component), controller);
};
RouteFactory.prototype.defaultUpdateRoute = (component, controller, pathPrefix) => {
    let self = this;
    return self._defaultRoute('PUT', pathWithId(pathPrefix, component), controller);
};
RouteFactory.prototype.defaultDeleteRoute = (component, controller, pathPrefix) => {
    let self = this;
    return self._defaultRoute('DELETE', pathWithId(pathPrefix, component), controller);
};
RouteFactory.prototype.discoverDefaultRoutes = (component, controller, pathPrefix) => {
    let self = this;
    const discover = {
        'new': 'defaultNewRoute',
        find: 'defaultFindRoute',
        findOne: 'defaultFindOneRoute',
        update: 'defaultUpdateRoute',
        'delete': 'defaultDeleteRoute'
    };
    _.forOwn(discover, (dfn, mthd) => {
        if (controller[mthd]) {
            self[dfn](component, controller[mthd], pathPrefix);
        }
    });
    return self;
};
RouteFactory.prototype.joinApproveRejectLeaveRoutes = (component, controller, pathPrefix) => {
    let self = this;
    _.forEach(['join', 'approve', 'reject', 'leave'], (action) => {
        self._defaultRoute('PUT', pathWithId(pathPrefix, component) + '/' + action, controller[action]);
    });
    return self;
};
module.exports = RouteFactory;

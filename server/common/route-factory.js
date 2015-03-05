'use strict';
var _ = require('lodash');

var RouteFactory = function () {
    var self = this;
    self.routes = [];
    self.current = -1;
    return self;
};
RouteFactory.prototype.newRoute = function () {
    var self = this;
    self.current = self.current + 1;
    self.routes.push({
        config: {
            pre: []
        }
    });
    return self;
};
RouteFactory.prototype.forMethod = function (method) {
    var self = this;
    self.routes[self.current].method = method;
    return self;
};
RouteFactory.prototype.onPath = function (path) {
    var self = this;
    self.routes[self.current].path = path;
    return self;
};
RouteFactory.prototype.usingAuthStrategy = function (strategy) {
    var self = this;
    self.routes[self.current].config.auth = {
        strategy: strategy
    };
    return self;
};
RouteFactory.prototype.withValidation = function (validator) {
    var self = this;
    self.routes[self.current].config.validate = validator;
    return self;
};
RouteFactory.prototype.preProcessWith = function (preProcess) {
    var self = this;
    preProcess.forEach(function (pre) {
        self.routes[self.current].config.pre.push(pre);
    });
    return self;
};
RouteFactory.prototype.handleUsing = function (handler) {
    var self = this;
    self.routes[self.current].handler = handler;
    return self;
};
RouteFactory.prototype.doneConfiguring = function () {
    var self = this;
    return self.routes;
};
RouteFactory.prototype.withController = function (controller) {
    var self = this;
    self.handleUsing(controller.handler);
    if (controller.validate) {
        self.withValidation(controller.validate);
    }
    if (controller.pre) {
        self.preProcessWith(controller.pre);
    }
    return self;
};
RouteFactory.prototype._defaultRoute = function (method, path, controller) {
    var self = this;
    self.newRoute()
        .forMethod(method)
        .onPath(path)
        .usingAuthStrategy('simple')
        .withController(controller);
    return self;
};
var path = function (pathPrefix, component) {
    return ((pathPrefix ? pathPrefix : '') + '/' + component);
};
var pathWithId = function (pathPrefix, component) {
    return ((pathPrefix ? pathPrefix : '') + '/' + component + '/{id}');
};
RouteFactory.prototype.defaultNewRoute = function (component, controller, pathPrefix) {
    var self = this;
    return self._defaultRoute('POST', path(pathPrefix, component), controller);
};
RouteFactory.prototype.defaultFindRoute = function (component, controller, pathPrefix) {
    var self = this;
    return self._defaultRoute('GET', path(pathPrefix, component), controller);
};
RouteFactory.prototype.defaultFindOneRoute = function (component, controller, pathPrefix) {
    var self = this;
    return self._defaultRoute('GET', pathWithId(pathPrefix, component), controller);
};
RouteFactory.prototype.defaultUpdateRoute = function (component, controller, pathPrefix) {
    var self = this;
    return self._defaultRoute('PUT', pathWithId(pathPrefix, component), controller);
};
RouteFactory.prototype.defaultDeleteRoute = function (component, controller, pathPrefix) {
    var self = this;
    return self._defaultRoute('DELETE', pathWithId(pathPrefix, component), controller);
};
RouteFactory.prototype.discoverDefaultRoutes = function (component, controller, pathPrefix) {
    var self = this;
    var discover = {
        'new': 'defaultNewRoute',
        find: 'defaultFindRoute',
        findOne: 'defaultFindOneRoute',
        update: 'defaultUpdateRoute',
        'delete': 'defaultDeleteRoute'
    };
    _.forOwn(discover, function (dfn, mthd) {
        if (controller[mthd]) {
            self[dfn](component, controller[mthd], pathPrefix);
        }
    });
    return self;
};

module.exports = RouteFactory;

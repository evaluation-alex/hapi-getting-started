'use strict';
var _ = require('lodash');

var RouteFactory = function () {
    var self = this;
    self._canContinueConfiguring = function () {
        if (!self.addedToServer) {
            return self;
        } else {
            throw new Error('Route already configured, cannot modify now');
        }
    };
    self.newRoute = function () {
        self.addedToServer = false;
        if (self.route) {
            delete self.route;
        }
        self.route = {
            config: {}
        };
        return self;
    };
    self.forMethod = function (method) {
        if (self._canContinueConfiguring()) {
            self.route.method = method;
        }
        return self;
    };
    self.onPath = function (path) {
        self.route.path = path;
        return self;
    };
    self.usingAuthStrategy = function (strategy) {
        if (self._canContinueConfiguring()) {
            self.route.config.auth = {
                strategy: strategy
            };
        }
        return self;
    };
    self.withValidation = function (validator) {
        if (self._canContinueConfiguring()) {
            self.route.config.validate = validator;
        }
        return self;
    };
    self.preProcessWith = function (preProcess) {
        if (self._canContinueConfiguring()) {
            if (!self.route.config.pre) {
                self.route.config.pre = [];
            }
            preProcess.forEach(function (pre) {
                self.route.config.pre.push(pre);
            });
        }
        return self;
    };
    self.handleUsing = function (handler) {
        if (self._canContinueConfiguring()) {
            self.route.handler = handler;
        }
        return self;
    };
    self.doneConfiguring = function () {
        if (!self.addedToServer) {
            self.addedToServer = true;
        } else {
            throw new Error('already registered route, create new route before registering with server again');
        }
        return self.route;
    };
    self.withController = function (controller) {
        self.handleUsing(controller.handler);
        if (controller.validator) {
            self.withValidation(controller.validator);
        }
        if (controller.pre) {
            self.preProcessWith(controller.pre);
        }
        return self;
    };
    self._defaultRoute = function (method, path, controller) {
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
    self.defaultFindRoute = function (component, controller, pathPrefix) {
        return self._defaultRoute('GET', path(pathPrefix, component), controller).doneConfiguring();
    };
    self.defaultFindOneRoute = function (component, controller, pathPrefix) {
        return self._defaultRoute('GET', pathWithId(pathPrefix, component), controller).doneConfiguring();
    };
    self.defaultUpdateRoute = function (component, controller, pathPrefix) {
        return self._defaultRoute('PUT', pathWithId(pathPrefix, component), controller).doneConfiguring();
    };
    self.defaultNewRoute = function (component, controller, pathPrefix) {
        return self._defaultRoute('POST', path(pathPrefix, component), controller).doneConfiguring();
    };
    self.defaultDeleteRoute = function (component, controller, pathPrefix) {
        return self._defaultRoute('DELETE', pathWithId(pathPrefix, component), controller).doneConfiguring();
    };
    self.discoverDefaultRoutes = function (component, controller, pathPrefix) {
        var routes = [];
        var discover = {
            find: self.defaultFindRoute,
            findOne: self.defaultFindOneRoute,
            update: self.defaultUpdateRoute,
            'new': self.defaultNewRoute,
            'delete': self.defaultDeleteRoute
        };
        _.forOwn(discover, function (dfn, mthd) {
            if (controller[mthd]) {
                routes.push(dfn(component, controller[mthd], pathPrefix));
            }
        });
        return routes;
    };
    return self;
};

module.exports = new RouteFactory();

'use strict';
var RouteFactory = require('./../common/route-factory');
var Controller = require('./controller');
module.exports = (new RouteFactory())
    .newRoute()
    .forMethod('POST')
    .onPath('/contact')
    .withController(Controller.contact)
    .doneConfiguring();

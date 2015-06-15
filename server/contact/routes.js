'use strict';
let RouteFactory = require('./../common/route-factory');
let Controller = require('./controller');
module.exports = (new RouteFactory())
    .newRoute()
    .forMethod('POST')
    .onPath('/contact')
    .withController(Controller.contact)
    .doneConfiguring();

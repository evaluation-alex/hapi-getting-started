'use strict';
let RouteFactory = require('./../../common/route-factory');
let Controller = require('./controller');
module.exports = (new RouteFactory())
    .newRoute()
    .forMethod('POST')
    .onPath('/session')
    .withController(Controller.login)
    .newRoute()
    .forMethod('DELETE')
    .onPath('/session')
    .usingAuthStrategy('simple')
    .withController(Controller.logout)
    .doneConfiguring();

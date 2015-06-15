'use strict';
let schemas = require('./schemas');
let Users = require('./../model');
let ControllerFactory = require('./../../common/controller-factory');
let onlyOwnerAllowed = require('./../../common/prereqs/only-owner');
var Controller = new ControllerFactory(Users)
    .updateController(schemas.update, [
        onlyOwnerAllowed(Users, 'email')
    ], 'update',
    'updateProfile')
    .doneConfiguring();
module.exports = Controller;

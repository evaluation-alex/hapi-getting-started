'use strict';
let schemas = require('./schemas');
let Config = require('./../../config');
let ControllerFactory = require('./../common/controller-factory');
let mailer = require('./../common/plugins/mailer');
let utils = require('./../common/utils');
var Controller = new ControllerFactory()
    .forMethod('contact')
    .withValidation(schemas.contact)
    .handleUsing((request, reply) => {
        let options = {
            subject: Config.projectName + ' contact form',
            to: Config.system.toAddress,
            replyTo: {
                name: request.payload.name,
                address: request.payload.email
            }
        };
        mailer.sendEmail(options, __dirname + '/contact.hbs.md', request.payload)
            .then(() => reply({message: 'Success.'}))
            .catch((err) => utils.logAndBoom(err, reply));
    })
    .doneConfiguring();
module.exports = Controller;
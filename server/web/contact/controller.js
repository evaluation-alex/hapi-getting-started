'use strict';
const path = require('path');
const config = require('./../../config');
const utils = require('./../../common/utils');
const {logAndBoom} = utils;
const Mailer = require('./../../common/plugins/mailer');
const {sendEmail} = Mailer;
const schemas = require('./schemas');
module.exports = {
    contact: {
        validate: schemas.controller.contact,
        handler(request, reply) {
            const options = {
                subject: config.projectName + ' contact form',
                to: config.system.toAddress,
                replyTo: {
                    name: request.payload.name,
                    address: request.payload.email
                }
            };
            sendEmail(options, path.join(__dirname, '/contact.hbs.md'), request.payload)
                .then(() => {
                    return {message: 'Success.'};
                })
                .catch(logAndBoom)
                .then(reply);
        }
    }
};

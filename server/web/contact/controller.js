'use strict';
const path = require('path');
const config = require('./../../config');
const {logAndBoom} = require('./../../common/utils');
const {sendEmail} = require('./../../common/plugins/mailer');
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

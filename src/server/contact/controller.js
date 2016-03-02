'use strict';
const path = require('path');
const config = require('./../config');
const utils = require('./../common/utils');
const {logAndBoom} = utils;
const Mailer = require('./../plugins/mailer');
const schema = require('./../../shared/rest-api')(require('joi'), require('./../lodash')).contact;
module.exports = {
    contact: {
        validate: schema.contact,
        handler(request, reply) {
            const options = {
                subject: config.projectName + ' contact form',
                to: config.system.toAddress,
                replyTo: {
                    name: request.payload.name,
                    address: request.payload.email
                }
            };
            Mailer.sendEmail(options, path.join(__dirname, '/contact.hbs.md'), request.payload)
                .then(() => ({message: 'Success.'}))
                .catch(logAndBoom)
                .then(reply);
        }
    }
};

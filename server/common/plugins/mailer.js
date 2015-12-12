'use strict';
const fs = require('fs');
const {clone, merge} = require('lodash');
const Bluebird = require('bluebird');
const hbs = require('handlebars');
const Nodemailer = require('nodemailer');
const {markdown} = require('nodemailer-markdown');
const config = require('./../../config');

const transport = Bluebird.promisifyAll(Nodemailer.createTransport(clone(config.nodemailer)));
transport.use('compile', markdown({useEmbeddedImages: true}));
const readFile = Bluebird.promisify(fs.readFile);

let templateCache = {};

const renderTemplate = Bluebird.method((template, context) => {
    context.projectName = config.projectName;
    if (templateCache[template]) {
        return templateCache[template](context);
    } else {
        return readFile(template, {encoding: 'utf-8'})
            .then(source => {
                templateCache[template] = hbs.compile(source);
                return templateCache[template](context);
            });
    }
});
module.exports.sendEmail = function sendEmail (options, template, context) {
    return renderTemplate(template, context)
        .then(content => {
            options = merge(options, {from: config.system.fromAddress, markdown: content});
            return transport.sendMailAsync(options);
        });
};

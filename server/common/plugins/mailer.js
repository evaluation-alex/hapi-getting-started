'use strict';
const fs = require('fs');
const _ = require('lodash');
const Bluebird = require('bluebird');
const hbs = require('handlebars');
const Nodemailer = require('nodemailer');
const NodemailerMarkdown = require('nodemailer-markdown');
const config = require('./../../config');
const {markdown} = NodemailerMarkdown;
const {clone, merge} = _;
const transport = Bluebird.promisifyAll(Nodemailer.createTransport(clone(config.nodemailer)));
transport.use('compile', markdown({useEmbeddedImages: true}));
const readFile = Bluebird.promisify(fs.readFile);
let cache = {};
const renderTemplate = Bluebird.method((template, context) => {
    context.projectName = config.projectName;
    if (cache[template]) {
        return cache[template](context);
    } else {
        return readFile(template, {encoding: 'utf-8'})
            .then(source => {
                cache[template] = hbs.compile(source);
                return cache[template](context);
            });
    }
});
const sendEmail = function sendEmail(options, template, context) {
    return renderTemplate(template, context)
        .then(content => {
            options = merge(options, {from: config.system.fromAddress, markdown: content});
            return transport.sendMailAsync(options);
        });
};
module.exports = {
    sendEmail
};

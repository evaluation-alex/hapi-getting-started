'use strict';
let Hoek = require('hoek');
let Fs = require('fs');
let Handlebars = require('handlebars');
let Nodemailer = require('nodemailer');
let markdown = require('nodemailer-markdown').markdown;
let Config = require('./../../config');
let Bluebird = require('bluebird');
let transport = Bluebird.promisifyAll(Nodemailer.createTransport(Hoek.clone(Config.nodemailer)));
transport.use('compile', markdown({useEmbeddedImages: true}));
let readFile = Bluebird.promisify(Fs.readFile);
let templateCache = {};
let renderTemplate = Bluebird.method((template, context) => {
    context.projectName = Config.projectName;
    if (templateCache[template]) {
        return templateCache[template](context);
    } else {
        return readFile(template, {encoding: 'utf-8'})
            .then((source) => {
                templateCache[template] = Handlebars.compile(source);
                return templateCache[template](context);
            });
    }
});
module.exports.sendEmail = (options, template, context) => {
    return renderTemplate(template, context)
        .then((content) => {
            options = Hoek.applyToDefaults(options, {
                from: Config.system.fromAddress,
                markdown: content
            });
            return transport.sendMailAsync(options);
        });
};

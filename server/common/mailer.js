'use strict';
var Hoek = require('hoek');
var Fs = require('fs');
var Handlebars = require('handlebars');
var Nodemailer = require('nodemailer');
var markdown = require('nodemailer-markdown').markdown;
var Config = require('./../../config');
var Promise = require('bluebird');
var transport = Promise.promisifyAll(Nodemailer.createTransport(Hoek.clone(Config.nodemailer)));
transport.use('compile', markdown({useEmbeddedImages: true}));
var readFile = Promise.promisify(Fs.readFile);

var templateCache = {};

var renderTemplate = function renderTemplate (template, context) {
    context.projectName = Config.projectName;
    if (templateCache[template]) {
        return Promise.resolve(templateCache[template](context));
    } else {
        return readFile(template, {encoding: 'utf-8'})
            .then(function (source) {
                templateCache[template] = Handlebars.compile(source);
                return templateCache[template](context);
            });
    }
};

module.exports.sendEmail = function sendEmail (options, template, context) {
    return renderTemplate(template, context)
        .then(function (content) {
            options = Hoek.applyToDefaults(options, {
                from: Config.system.fromAddress,
                markdown: content
            });
            return transport.sendMailAsync(options);
        });
};

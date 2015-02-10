'use strict';
var Hoek = require('hoek');
var Fs = require('fs');
var Handlebars = require('handlebars');
var Nodemailer = require('nodemailer');
var markdown = require('nodemailer-markdown').markdown;
var Config = require('./../../config');
var Promise = require('bluebird');

var transport = Nodemailer.createTransport(Hoek.clone(Config.nodemailer));
transport.use('compile', markdown({useEmbeddedImages: true}));

var templateCache = {};

var renderTemplate = function (template, context) {
    return new Promise(function (resolve, reject) {
        context.projectName = Config.projectName;
        if (templateCache[template]) {
            resolve(templateCache[template](context));
        } else {
            Fs.readFile(template, {encoding: 'utf-8'}, function (err, source) {
                if (err) {
                    reject(err);
                } else {
                    templateCache[template] = Handlebars.compile(source);
                    resolve(templateCache[template](context));
                }
            });
        }
    });
};

var sendEmail = exports.sendEmail = function (options, template, context) {
    return new Promise(function (resolve, reject) {
        renderTemplate(template, context)
            .then(function (content) {
                options = Hoek.applyToDefaults(options, {
                    from: Config.system.fromAddress,
                    markdown: content
                });
                transport.sendMail(options, function (err, res) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            })
            .done();
    });
};

module.exports.sendEmail = sendEmail;

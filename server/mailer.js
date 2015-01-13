'use strict';
var Hoek = require('hoek');
var Fs = require('fs');
var Handlebars = require('handlebars');
var Nodemailer = require('nodemailer');
var markdown = require('nodemailer-markdown').markdown;
var Config = require('../config').config({argv:[]});
var Promise = require('bluebird');

var transport = Nodemailer.createTransport(Hoek.clone(Config.nodemailer));
transport.use('compile', markdown({useEmbeddedImages: true}));

var templateCache = {};

var renderTemplate = function (signature, context) {
    var promise = new Promise(function (resolve, reject) {
        if (templateCache[signature]) {
            resolve(templateCache[signature](context));
        } else {
            var filePath = __dirname + '/emails/' + signature + '.hbs.md';
            Fs.readFile(filePath, {encoding: 'utf-8'}, function (err, source) {
                if (err) {
                    reject(err);
                } else {
                    templateCache[signature] = Handlebars.compile(source);
                    resolve(templateCache[signature](context));
                }
            });
        }
    });
    return promise;
};

var sendEmail = exports.sendEmail = function (options, template, context) {
    var promise = new Promise(function (resolve, reject) {
        var isDone = false;
        renderTemplate(template, context)
            .then(function (content) {
                options = Hoek.applyToDefaults(options, {
                    from: Config.system.fromAddress,
                    markdown: content
                });
                transport.sendMail(options, function (err, res) {
                    isDone = true;
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            })
            .catch(function (err) {
                if (err && !isDone) {
                    reject(err);
                }
            })
            .done();
    });
    return promise;
};

exports.register = function (server, options, next) {
    server.expose('sendEmail', sendEmail);
    next();
};

exports.register.attributes = {
    name: 'mailer'
};

'use strict';
import fs from 'fs';
import {clone, merge} from 'lodash';
import Bluebird from 'bluebird';
import hbs from 'handlebars';
import Nodemailer from 'nodemailer';
import {markdown} from 'nodemailer-markdown';
import config from './../../config';

let transport = Bluebird.promisifyAll(Nodemailer.createTransport(clone(config.nodemailer)));
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
export function sendEmail (options, template, context) {
    return renderTemplate(template, context)
        .then(content => {
            options = merge(options, {from: config.system.fromAddress, markdown: content});
            return transport.sendMailAsync(options);
        });
}

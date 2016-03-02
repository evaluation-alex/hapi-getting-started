'use strict';
const fs = require('fs');
const i18n = require('i18n');
const dgram = require('dgram');
const devnull = require('dev-null');
const bunyan = require('bunyan');
const {createLogger} = bunyan;
const args = JSON.parse(fs.readFileSync('./build/server/options.json'));
const nodemailer = (!args.sendemails) ? {
        name: 'minimal',
        version: '0.1.0',
        send(mail, cb) {
            const input = mail.message.createReadStream();
            input.pipe(devnull());
            input.on('end', () => {
                cb(null, true);
            });
        }
    } : /*istanbul ignore next*/
    args.nodemailer;
i18n.configure(args.i18n);
const logger = createLogger(args.bunyan);
const influxdb = args.influxdb;
influxdb.udpClient = dgram.createSocket('udp4');
const manifest = args.manifest;
manifest.connections.forEach(connection => {
    /*istanbul ignore if*//*istanbul ignore else*/
    if (connection.tls &&
        connection.tls.key &&
        connection.tls.key.length > 0 &&
        connection.tls.cert &&
        connection.tls.cert.length > 0 &&
        fs.existsSync(connection.tls.key) &&
        fs.existsSync(connection.tls.cert)) {
        connection.tls.key = fs.readFileSync(connection.tls.key);
        connection.tls.cert = fs.readFileSync(connection.tls.cert);
    } else {
        delete connection.tls;
    }
});
manifest.plugins['hapi-bunyan'].logger = logger;
module.exports = {
    enableConsole: args.enableConsole,
    projectName: args.project,
    authAttempts: {
        forIp: 500,
        forIpAndUser: 500
    },
    nodemailer,
    logger,
    system: {
        fromAddress: {
            name: args.project,
            address: args.nodemailer.auth.user
        },
        toAddress: {
            name: args.project,
            address: args.nodemailer.auth.user
        }
    },
    i18n,
    influxdb,
    manifest
};


'use strict';
var Fs = require('fs');
var devnull = require('dev-null');

if (!Fs.existsSync('.opts')) {
    console.log('.opts file missing. will exit');
    process.exit(1);
}

var args = JSON.parse(Fs.readFileSync('.opts'));
var nodemailer = {};
if (!args.sendemails) {
    nodemailer = {
        name: 'minimal',
        version: '0.1.0',
        send: function (mail, callback) {
            var input = mail.message.createReadStream();
            input.pipe(devnull());
            input.on('end', function () {
                callback(null, true);
            });
        }
    };
} else {
    nodemailer = {
        host: args.mail.host,
        port: args.mail.port,
        secure: true,
        auth: {
            user: args.mail.user,
            pass: args.mail.password
        }
    };
}

var config = {
    projectName: args.project,
    port: args.port,
    authAttempts: {
        forIp: 50,
        forIpAndUser: 7
    },
    hapiMongoModels: {
        mongodb: {
            url: args.mongodburl
        },
        autoIndex: true
    },
    nodemailer: nodemailer,
    logs: {
        logDir: args.logdir
    },
    system: {
        fromAddress: {
            name: args.project,
            address: args.mail.user
        },
        toAddress: {
            name: args.project,
            address: args.mail.user
        }
    },
    logMetrics: args.logmetrics
};
if (args.https.tls.key.length > 0 && args.https.tls.cert.length > 0 && Fs.existsSync(args.https.tls.key) && Fs.existsSync(args.https.tls.cert)) {
    config.tls = {
        key: Fs.readFileSync(args.https.tls.key),
        cert: Fs.readFileSync(args.https.tls.cert)
    };
}

module.exports = config;

'use strict';
let Fs = require('fs');
let devnull = require('dev-null');
let Bunyan = require('bunyan');
var StatsD = require('node-statsd');
var i18n = require('i18n');

if (!Fs.existsSync('.opts')) {
    console.log('.opts file missing. will exit');
    process.exit(1);
}

let args = JSON.parse(Fs.readFileSync('.opts'));
let nodemailer = {};
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

let logOptions = {
    name: 'main',
    streams: [{
        type: 'rotating-file',
        path: args.logdir + '/' + args.project + '.log',
        period: '1d',
        count: 7,
        name: 'file',
        level: 'debug'
    }]
};

let statsdOptions = {
    host: args.statsd.host,
    port: args.statsd.port,
    mock: !args.statsd.logmetrics
};

let i18nOptions = {
    locales: ['en'],
    defaultLocale: 'en',
    directory: './i18n'
};

i18n.configure(i18nOptions);

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
    logger: Bunyan.createLogger(logOptions),
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
    storage: {
        diskPath: args.storage.diskPath
    },
    statsd: new StatsD(statsdOptions),
    i18n: i18n
};
if (args.https.tls.key.length > 0 && args.https.tls.cert.length > 0 && Fs.existsSync(args.https.tls.key) && Fs.existsSync(args.https.tls.cert)) {
    config.tls = {
        key: Fs.readFileSync(args.https.tls.key),
        cert: Fs.readFileSync(args.https.tls.cert)
    };
}

module.exports = config;

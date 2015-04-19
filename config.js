'use strict';
let Fs = require('fs');
let devnull = require('dev-null');
let Bunyan = require('bunyan');
let StatsD = require('node-statsd');
let i18n = require('i18n');
if (!Fs.existsSync('.opts')) {
    console.log('.opts file missing. will exit');
    process.exit(1);
}
if (!Fs.existsSync('manifest.json')) {
    console.log('manifest.json file missing. will exit');
    process.exit(1);
}
let args = JSON.parse(Fs.readFileSync('.opts'));
let manifest = JSON.parse(Fs.readFileSync('manifest.json'));
let nodemailer = {};
if (!args.sendemails) {
    nodemailer = {
        name: 'minimal',
        version: '0.1.0',
        send: (mail, callback) => {
            let input = mail.message.createReadStream();
            input.pipe(devnull());
            input.on('end', function () {
                callback(null, true);
            });
        }
    };
} else {
    nodemailer = args.nodemailer;
}
i18n.configure(args.i18n);
var config = {
    projectName: args.project,
    authAttempts: {
        forIp: 50,
        forIpAndUser: 7
    },
    nodemailer: nodemailer,
    logger: Bunyan.createLogger(args.bunyan),
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
    storage: {
        diskPath: args.storage.diskPath
    },
    statsd: new StatsD(args.statsd),
    i18n: i18n,
    manifest: {
        plugins: manifest.plugins,
        server: manifest.server
    }
};
if (manifest.connections[0].tls.key.length > 0 &&
    manifest.connections[0].tls.cert.length > 0 &&
    Fs.existsSync(manifest.connections[0].tls.key) &&
    Fs.existsSync(manifest.connections[0].tls.cert)) {
    manifest.connections[0].tls.key = Fs.readFileSync(manifest.connections[0].tls.key);
    manifest.connections[0].tls.cert = Fs.readFileSync(manifest.connections[0].tls.cert);
}
config.manifest.connections = args.connections;
config.manifest.plugins['hapi-bunyan'].logger = config.logger;
module.exports = config;

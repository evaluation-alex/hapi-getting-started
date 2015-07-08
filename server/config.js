'use strict';
/*eslint-disable no-process-exit*/
let _ = require('lodash');
let fs = require('fs');
let devnull = require('dev-null');
let Bunyan = require('bunyan');
let StatsD = require('node-statsd');
let i18n = require('i18n');
/* istanbul ignore if  */
if (!fs.existsSync('./server/.opts')) {
    console.log('.opts file missing. will exit');
    process.exit(1);
}
/* istanbul ignore if  */
if (!fs.existsSync('./server/manifest.json')) {
    console.log('manifest.json file missing. will exit');
    process.exit(1);
}
let args = JSON.parse(fs.readFileSync('./server/.opts'));
let manifest = JSON.parse(fs.readFileSync('./server/manifest.json'));
let nodemailer = {};
/* istanbul ignore else  */
if (!args.sendemails) {
    nodemailer = {
        name: 'minimal',
        version: '0.1.0',
        send: (mail, cb) => {
            let input = mail.message.createReadStream();
            input.pipe(devnull());
            input.on('end', function () {
                cb(null, true);
            });
        }
    };
} else {
    nodemailer = args.nodemailer;
}
i18n.configure(args.i18n);
let config = {
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
    statsd: new StatsD(args.statsd),
    i18n: i18n,
    manifest: {
        plugins: manifest.plugins,
        server: manifest.server,
        connections: manifest.connections
    }
};

_.forEach(manifest.connections, (connection) => {
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
config.manifest.plugins['hapi-bunyan'].logger = config.logger;
config.manifest.plugins['./server/common/plugins/dbindexes'].modules = [
    'audit',
    'users',
    'users/roles',
    'users/notifications',
    'users/session/auth-attempts',
    'user-groups',
    'blogs',
    'blogs/posts'
];
/*eslint-enable no-process-exit*/
module.exports = config;

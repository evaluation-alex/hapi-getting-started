'use strict';
/*eslint-disable no-process-exit*/
import fs from 'fs';
import devnull from 'dev-null';
import Bunyan from 'bunyan';
import StatsD from 'node-statsd';
import i18n from 'i18n';
/* istanbul ignore if  */
if (!fs.existsSync('./build/.opts')) {
    console.log('.opts file missing. will exit');
    process.exit(1);
}
/* istanbul ignore if  */
if (!fs.existsSync('./build/manifest.json')) {
    console.log('manifest.json file missing. will exit');
    process.exit(1);
}
/*eslint-enable no-process-exit*/
let args = JSON.parse(fs.readFileSync('./build/.opts'));
let manifest = JSON.parse(fs.readFileSync('./build/manifest.json'));
let nodemailer = {};
/* istanbul ignore else  */
if (!args.sendemails) {
    nodemailer = {
        name: 'minimal',
        version: '0.1.0',
        send(mail, cb) {
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

manifest.connections.forEach(connection => {
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
export default config;

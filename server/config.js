'use strict';
/*eslint-disable no-process-exit*/
import fs from 'fs';
import devnull from 'dev-null';
import {createLogger} from 'bunyan';
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
            input.on('end', () => {
                cb(null, true);
            });
        }
    };
} else {
    nodemailer = args.nodemailer;
}
i18n.configure(args.i18n);
let logger = createLogger(args.bunyan);
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
export default {
    projectName: args.project,
    authAttempts: {
        forIp: 50,
        forIpAndUser: 7
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
    manifest
};


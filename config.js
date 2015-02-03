'use strict';
var deepFreeze = require('deep-freeze-strict');
var Fs = require('fs');

var args = {};
if (Fs.existsSync('.opts')) {
    args = JSON.parse(Fs.readFileSync('.opts'));
} else {
    console.log('.opts file missing. will exit');
    process.exit(1);
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
    sendmails: args.sendmails,
    nodemailer: {
        host: args.mailhost,
        port: args.mailport,
        secure: true,
        auth: {
            user: args.mailuser,
            pass: args.mailpassword
        }
    },
    logs: {
        logDir: args.logdir,
        logConfig: args.logconfig
    },
    system: {
        fromAddress: {
            name: args.project,
            address: args.mailuser
        },
        toAddress: {
            name: args.project,
            address: args.mailuser
        }
    }
};

config = deepFreeze(config);

module.exports = config;

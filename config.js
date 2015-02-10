'use strict';
var deepFreeze = require('deep-freeze-strict');
var Fs = require('fs');
var devnull = require('dev-null');

var args = {};
var config = {};
if (Fs.existsSync('.opts')) {
    args = JSON.parse(Fs.readFileSync('.opts'));
    var nodemailer = {};
    if (!args.sendemails) {
        nodemailer = {
            name: 'minimal',
            version: '0.1.0',
            send: function(mail, callback) {
                var input = mail.message.createReadStream();
                input.pipe(devnull());
                input.on('end', function() {
                    callback(null, true);
                });
            }
        };
    } else {
        nodemailer = {
            host: args.mailhost,
            port: args.mailport,
            secure: true,
            auth: {
                user: args.mailuser,
                pass: args.mailpassword
            }
        };
    }
    config = {
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
} else {
    console.log('.opts file missing. will exit');
    process.exit(1);
}

config = deepFreeze(config);

module.exports = config;

'use strict';
var Fs = require('fs');
var Promptly = require('promptly');
var Promise = require('bluebird');

var test = {
    projectName: 'hapistart',
    mongodbUrl: 'mongodb://127.0.0.1:27017/hapistart',
    rootEmail: 'root',
    rootPassword: '^YOURPWD$',
    systemEmail: 'system@yoursystem.com',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpUsername: 'you',
    smtpPassword: '^YOURSMTPWD$',
    port: 3000,
    logdir: './logs'
};

var fromStdIn = function (results, property, message, opts) {
    return new Promise(function (resolve, reject) {
        if (process.env.NODE_ENV === 'test') {
            results[property] = test[property];
            resolve(results);
        } else {
            Promptly.prompt(message, opts, function (err, out) {
                if (err) {
                    reject(err);
                } else {
                    if (out) {
                        results[property] = out;
                    } else {
                        results[property] = opts.default;
                    }
                }
                resolve(results);
            });
        }
    });
};

var handleErr = function (err) {
    if (err) {
        console.error('Setup failed.');
        console.error(err);
        return process.exit(1);
    }
};

fromStdIn({}, 'projectName', 'Project name: (hapistart) ', {default: 'hapistart'})
    .then(function (results) {
        return fromStdIn(results, 'mongodbUrl', 'MongoDB URL: (mongodb://localhost:27017/' + results.projectName + ') ', {default: 'mongodb://localhost:27017/' + results.projectName});
    })
    .then(function (results) {
        results.rootEmail = 'root';
        return results;
    })
    .then(function (results) {
        return fromStdIn(results, 'rootPassword', 'Root user password: ', {default: ''});
    })
    .then(function (results) {
        return fromStdIn(results, 'smtpHost', 'SMTP host: (smtp.gmail.com) ', {default: 'smtp.gmail.com'});
    }).
    then(function (results) {
        return fromStdIn(results, 'smtpPort', 'SMTP port: (465) ', {default: 465});
    })
    .then(function (results) {
        return fromStdIn(results, 'smtpUsername', 'SMTP username: (' + results.rootEmail + ') ', {default: results.systemEmail});
    })
    .then(function (results) {
        return fromStdIn(results, 'smtpPassword', 'SMTP password: ', {default: ''});
    })
    .then(function (results) {
        return fromStdIn(results, 'port', 'port: ', {default: 3000});
    })
    .then(function (results) {
        return fromStdIn(results, 'logdir', 'log directory: ', {default: './logs'});
    })
    .then(function (results) {
        console.log('setting up with - ' + JSON.stringify(results));
        var opts = {
            env: 'dev',
            project: results.projectName,
            port: results.port,
            mongodburl: results.mongodbUrl,
            mail: {
                user: results.smtpUsername,
                password: results.smtpPassword,
                host: results.smtpHost,
                port: results.smtpPort
            },
            logdir: results.logdir,
            sendemails: false,
            https: {
                tls: {
                    key: '',
                    cert: ''
                }
            }
        };
        Fs.writeFileSync('.opts', JSON.stringify(opts, null, 4));
        return results;
    })
    .catch(handleErr)
    .done(function () {
        console.log('Setup complete.');
        process.exit(0);
    });

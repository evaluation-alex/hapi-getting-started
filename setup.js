'use strict';
let Fs = require('fs');
let Promptly = require('promptly');
let Bluebird = require('bluebird');
let test = {
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
    logdir: './logs',
    logMetrics: false,
    diskStoragePath: './data',
    statsdhost: '127.0.0.1',
    statsdport: 8125,
    certfile: './secure/cert.pem',
    keyfile: './secure/key.pem'
};
let fromStdIn = (results, property, message, opts) => {
    return new Bluebird((resolve, reject) => {
        if (process.env.NODE_ENV === 'test') {
            results[property] = test[property];
            resolve(results);
        } else {
            Promptly.prompt(message, opts, (err, out) => {
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
var handleErr = (err) => {
    if (err) {
        console.error('Setup failed.');
        console.error(err);
        return process.exit(1);
    }
};
fromStdIn({}, 'projectName', 'Project name: (hapistart) ', {'default': 'hapistart'})
    .then((results) => fromStdIn(results,
        'mongodbUrl',
        'MongoDB URL: (mongodb://localhost:27017/' + results.projectName + ') ',
        {'default': 'mongodb://localhost:27017/' + results.projectName}
    ))
    .then((results) => {
        results.rootEmail = 'root';
        return results;
    })
    .then((results) => fromStdIn(results, 'rootPassword', 'Root user password: ', {'default': ''}))
    .then((results) => fromStdIn(results, 'smtpHost', 'SMTP host: (smtp.gmail.com) ', {'default': 'smtp.gmail.com'}))
    .then((results) => fromStdIn(results, 'smtpPort', 'SMTP port: (465) ', {'default': 465}))
    .then((results) => fromStdIn(results, 'smtpUsername', 'SMTP username: (' + results.rootEmail + ') ', {'default': results.systemEmail}))
    .then((results) => fromStdIn(results, 'smtpPassword', 'SMTP password: ', {'default': ''}))
    .then((results) => fromStdIn(results, 'port', 'port: ', {'default': 3000}))
    .then((results) => fromStdIn(results, 'logdir', 'log directory: ', {'default': './logs'}))
    .then((results) => fromStdIn(results, 'logMetrics', 'capture metrics: ', {'default': true}))
    .then((results) => fromStdIn(results, 'diskStoragePath', 'disk storage path: ', {'default': './'}))
    .then((results) => fromStdIn(results, 'statsdhost', 'statsd host: ', {'default': '127.0.0.1'}))
    .then((results) => fromStdIn(results, 'statsdport', 'statsd port: ', {'default': 8125}))
    .then((results) => fromStdIn(results, 'statsdport', 'statsd port: ', {'default': 8125}))
    .then((results) => fromStdIn(results, 'certfile', 'certificate file for https: ', {'default': './secure/cert.pem'}))
    .then((results) => fromStdIn(results, 'keyfile', 'key file for https: ', {'default': './secure/key.pem'}))
    .then((results) => {
        console.log('setting up with - ' + JSON.stringify(results));
        var opts = {
            env: 'dev',
            project: results.projectName,
            nodemailer: {
                auth: {
                    user: results.smtpUsername,
                    pass: results.smtpPassword
                },
                secure: true,
                host: results.smtpHost,
                port: results.smtpPort
            },
            bunyan: {
                name: 'main',
                streams: [{
                    type: 'rotating-file',
                    path: results.logdir + '/' + results.projectName + '.log',
                    period: '1d',
                    count: 7,
                    name: 'file',
                    level: 'debug'
                }]
            },
            sendemails: false,
            storage: {
                diskPath: results.diskStoragePath
            },
            statsd: {
                host: results.statsdhost,
                port: results.statsdport,
                mock: !results.logMetrics
            },
            'i18n': {
                locales: ['en'],
                defaultLocale: 'en',
                directory: './i18n'
            }
        };
        var manifest = {
            plugins: {
                'hapi-bunyan': {
                    'logger': '',
                    'mergeData': true,
                    'includeTags': true,
                    'joinTags': ','
                },
                'lout': {},
                'poop': {logPath: results.logdir},
                'tv': {},
                'hapi-require-https': {},
                'hapi-auth-basic': {},
                './server/common/plugins/model': {
                    connections: {
                        app: {
                            url: results.mongodbUrl
                        }
                    },
                    models: [
                        './server/audit/model',
                        './server/users/model',
                        './server/users/session/auth-attempts/model',
                        './server/users/roles/model',
                        './server/users/notifications/model',
                        './server/user-groups/model',
                        './server/blogs/model',
                        './server/blogs/posts/model'
                    ],
                    'autoIndex': true
                },
                './server/common/plugins/auth': {},
                './server/common/plugins/i18n': {},
                './server/common/plugins/metrics': {},
                './server/contact': {},
                './server/audit': {},
                './server/users': {},
                './server/users/session': {},
                './server/users/session/auth-attempts': {},
                './server/users/notifications': {},
                './server/users/preferences': {},
                './server/users/profile': {},
                './server/user-groups': {},
                './server/blogs': {},
                './server/blogs/posts': {}
            },
            connections: [{
                port: results.port,
                labels: ['api'],
                tls: {
                    key: results.keyfile,
                    cert: results.certfile
                }
            }],
            server: {
                connections: {
                    routes: {
                        security: true
                    }
                }
            }
        };
        Fs.writeFileSync('.opts', JSON.stringify(opts, null, 4));
        Fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 4));
        return results;
    })
    .catch(handleErr)
    .done(() => {
        console.log('Setup complete.');
        process.exit(0);
    });

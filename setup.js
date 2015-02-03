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
    smtpPassword: '^YOURSMTPWD$'
};

var fromStdIn = function (results, property, message, opts) {
    var p = new Promise(function (resolve, reject) {
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
    return p;
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
        return fromStdIn(results, 'logdir', 'log directory: ', {default: './logs'});
    })
    .then(function (results) {
        console.log('setting up with - ' + JSON.stringify(results));
        var opts = {
            env: 'dev',
            project: results.projectName,
            port: results.port,
            mongodburl: results.mongodbUrl,
            mailuser: results.smtpUsername,
            mailpassword: results.smtpPassword,
            mailhost: results.smtpHost,
            mailport: results.smtpPort,
            logdir: results.logdir,
            logconfig: {
                log: '*',
                response: '*',
                request: '*',
                'error': '*',
                'ops': '*'
            },
            sendemails: false
        };
        Fs.writeFileSync('.opts', JSON.stringify(opts, null, 4));
        return results;
    })
    .then(function (results) {
        var BaseModel = require('hapi-mongo-models').BaseModel;
        var Users = require('./server/users/model');
        var Roles = require('./server/roles/model');
        BaseModel.connect({url: results.mongodbUrl}, function (err, db) {
            Users.remove.bind(Users, {});
            Roles.remove.bind(Roles, {});
            Roles.create('root', [{action: 'update', object: '*'}])
                .then(function () {
                    return Roles.create('readonly', [{action: 'view', object: '*'}]);
                })
                .then(function () {
                    Users.create('root', results.rootPassword);
                })
                .then(function (u1) {
                    return u1.updateRoles(['root'], 'setup');
                }).then(function () {
                    return Users.create('one@first.com', 'password');
                })
                .catch(handleErr)
                .done();
        });
    })
    .catch(handleErr)
    .done(function () {
        console.log('Setup complete.');
        process.exit(0);
    });

'use strict';
var Fs = require('fs');
var Path = require('path');
var Promptly = require('promptly');
var Handlebars = require('handlebars');
var Promise = require('bluebird');

if (process.env.NODE_ENV === 'test') {
    var context = {
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
    var source = Fs.readFileSync(Path.resolve(__dirname, 'config.example'), {encoding: 'utf-8'});
    var configTemplate = Handlebars.compile(source);
    Fs.writeFileSync(Path.resolve(__dirname, 'config.js'), configTemplate(context));
    console.log('Setup complete.');
    process.exit(0);
}

var fromStdIn = function (results, property, message, opts) {
    var p = new Promise(function (resolve, reject) {
        Promptly.prompt(message, opts, function (err, out) {
            if (err) {
                reject(err);
            } else {
                if (out) {
                    results[property] = out;
                } else {
                    results[property] = opts.default;
                }
                resolve(results);
            }
        });
    });
    return p;
};

fromStdIn({}, 'projectName', 'Project name: (hapistart) ', {default: 'hapistart'})
    .then(function (results) {
        return fromStdIn(results, 'mongodbUrl', 'MongoDB URL: (mongodb://localhost:27017/' + results.projectName + ') ', {default: 'mongodb://localhost:27017/' + results.projectName});
    })
    .then(function (results) {
        return fromStdIn(results, 'rootEmail', 'Root user email: ', {default: ''});
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
        return fromStdIn(results, 'smtpUsername', 'SMTP username: (' + results.systemEmail + ') ', {default: results.systemEmail});
    })
    .then(function (results) {
        return fromStdIn(results, 'smtpPassword', 'SMTP password: ', {default: ''});
    })
    .then(function (results) {
        return fromStdIn(results, 'logdir', 'log directory: ', {default: './logs'});
    })
    .then(function (results) {
        var source = Fs.readFileSync(Path.resolve(__dirname, 'config.example'), {encoding: 'utf-8'});
        var configTemplate = Handlebars.compile(source);
        Fs.writeFileSync(Path.resolve(__dirname, 'config.js'), configTemplate(results));
        results.configPath = './config.js';
        return results;
    })
    .then(function (results) {
        var BaseModel = require('hapi-mongo-models').BaseModel;
        var Users = require('./server/models/users');
        var Roles = require('./server/models/roles');
        BaseModel.connect({url: results.mongodbUrl}, function (err, db) {
            Users.remove.bind(Users, {});
            Roles.remove.bind(Roles, {});
            Roles.create('root', [{action: 'update', object: '*'}], function (err) {
                if (err) {
                    throw err;
                }
            });
            Roles.create('readonly', [{action: 'view', object: '*'}], function (err) {
                if (err) {
                    throw err;
                }
            });
            Users.create(results.rootEmail, results.rootPassword);
            Users.update({email: results.rootEmail}, {$set: {roles: ['root']}}, function (err) {
                if (err) {
                    throw err;
                }
            });
            Users.create('one@first.com', 'password');
        });
    })
    .catch(function (err) {
        if (err) {
            console.error('Setup failed.');
            console.error(err);
            return process.exit(1);
        }
    })
    .done(function () {
        console.log('Setup complete.');
        process.exit(0);
    });

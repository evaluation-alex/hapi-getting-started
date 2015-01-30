'use strict';
var Fs = require('fs');
var Path = require('path');
var Promptly = require('promptly');
var Handlebars = require('handlebars');
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
            });
        }
        resolve(results);
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
        console.log('setting up with - ' + JSON.stringify(results));
        var BaseModel = require('hapi-mongo-models').BaseModel;
        var Users = require('./server/models/users');
        var Roles = require('./server/models/roles');
        BaseModel.connect({url: results.mongodbUrl}, function (err, db) {
            Users.remove.bind(Users, {});
            Roles.remove.bind(Roles, {});
            var r1 = Roles.create('root', [{action: 'update', object: '*'}]);
            var r2 = Roles.create('readonly', [{action: 'view', object: '*'}]);
            var u1 = Users.create('root', results.rootPassword);
            var u2 = Users.create('one@first.com', 'password');
            Promise.join(r1, r2, u1, u2, function (r1, r2, u1, u2) {
                console.log('Role(root) - ' + JSON.stringify(r1));
                console.log('Role(readonly) - ' + JSON.stringify(r2));
                u1.updateRoles(['root'], 'setup').done();
                console.log('User(root) - ' + JSON.stringify(u1));
                console.log('User(one@first.com) - ' + JSON.stringify(u2));
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

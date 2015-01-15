'use strict';
var Config = require('./../../../config').config({argv: []});
var Manifest = require('./../../../manifest').manifest;
var Hapi = require('hapi');
var HapiAuthBasic = require('hapi-auth-basic');
var SignupPlugin = require('./../../../server/api/signup');
var MailerPlugin = require('./../../../server/mailer');
var HapiMongoModels = require('hapi-mongo-models');
var Fs = require('fs');
var Promise = require('bluebird');
//var expect = require('chai').expect;
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;


describe('Signup', function () {
    var ModelsPlugin, server, emails = [];

    beforeEach(function (done) {
        ModelsPlugin = {
            register: HapiMongoModels,
            options: JSON.parse(JSON.stringify(Manifest)).plugins['hapi-mongo-models']
        };
        var plugins = [ HapiAuthBasic, ModelsPlugin, MailerPlugin, SignupPlugin ];
        server = new Hapi.Server();
        server.connection({ port: Config.port.web });
        server.register(plugins, function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    it('returns a conflict when you try to signup with user that already exists', function (done) {
        var request = {
            method: 'POST',
            url: '/signup',
            payload: {
                email: 'one@first.com',
                password: 'try becoming the first'
            }
        };
        server.inject(request, function (response) {
            expect(response.statusCode).to.equal(409);
            done();
        });
    });

    it.skip('fails when the signup email send fails', function (done) {
        Fs.renameSync('./server/emails/welcome.hbs.md', './server/emails/welcome2.hbs.md');
        var request = {
            method: 'POST',
            url: '/signup',
            payload: {
                email: 'test.signup@signup.api',
                password: 'p4ssw0rd'
            }
        };
        emails.push(request.payload.email);
        server.inject(request, function (response) {
            Fs.renameSync('./server/emails/welcome2.hbs.md', './server/emails/welcome.hbs.md');
            expect(response.statusCode).to.equal(500);
            done();
        });
    });

    it('creates a user succesfully if all validations are complete. The user has a valid session, user email is sent, and user audit shows signup, loginSuccess records', function (done) {
        var request = {
            method: 'POST',
            url: '/signup',
            payload: {
                email: 'test.signup2@signup.api',
                password: 'an0th3r1'
            }
        };
        emails.push(request.payload.email);
        server.inject(request, function (response) {
            expect(response.statusCode).to.equal(200);
            var Users = server.plugins['hapi-mongo-models'].Users;
            var Audit = server.plugins['hapi-mongo-models'].Audit;
            var p1 = Users._findOne({email: 'test.signup2@signup.api'})
                .then(function (foundUser) {
                    expect(foundUser).to.exist();
                    expect(foundUser.session).to.exist();
                });
            var p2 = Audit.findUsersAudit({userId: 'test.signup2@signup.api',action:'signup'})
                .then(function(foundSignup) {
                    expect(foundSignup).to.exist();
                    expect(foundSignup[0].newValues).to.include('test.signup2@signup.api');
                });
            var p3 = Audit.findUsersAudit({userId: 'test.signup2@signup.api',action:'login success'})
                .then(function(foundLogin) {
                    expect(foundLogin).to.exist();
                });
            Promise.join(p1, p2, p3, function (v1, v2, v3) {
                done();
            });
        });
    });

    afterEach(function (done) {
        if (emails.length > 0 ){
            var Users = server.plugins['hapi-mongo-models'].Users;
            var Audit = server.plugins['hapi-mongo-models'].Audit;
            Users.remove({email: { $in: emails}}, function (err) {
                if (err) {
                    throw err;
                }
                Audit.remove({objectChangedId: { $in: emails}}, function (err) {
                    if (err) {
                        throw err;
                    }
                    done();
                });
            });
        } else {
            done();
        }
    });

});

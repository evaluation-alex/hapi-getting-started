'use strict';
var Hapi = require('hapi');
var Config = require('./../../config').config({argv: []});
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

describe('Mailer', function () {

    var server;
    before(function (done) {
        server = new Hapi.Server();
        server.connection({ port: Config.port.web });
        server.register(require('./../../server/mailer'), {}, function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    it('successfuly registers itself', function (done) {
        expect(server.plugins.mailer).to.exist();
        expect(server.plugins.mailer.sendEmail).to.be.an.instanceof(Function);
        done();
    });


    it('returns error when read file fails', function (done) {
        server.plugins.mailer.sendEmail({}, 'path', {})
            .then(function (info) {
                expect(info).to.not.exist();
            })
            .catch(function (err) {
                expect(err).to.be.an.instanceof(Error);
            })
            .done(function () {
                done();
            });
    });


    it.skip('sends an email', function (done) {
        var options = {
            subject: 'Your ' + Config.projectName + ' account',
            to: {
                name: Config.smtpUsername,
                address: Config.smtpUsername
            }
        };
        var payload = {
            email: 'email',
            password: 'password'
        };
        server.plugins.mailer.sendEmail(options, 'welcome', payload)
            .then(function (info) {
                expect(info).to.exist();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
            })
            .done(function () {
                done();
            });
    });
});

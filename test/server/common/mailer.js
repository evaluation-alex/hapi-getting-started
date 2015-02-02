'use strict';
var relativeToServer = './../../../server/';
var relativeTo = './../../../';

var Config = require(relativeTo+'config').config({argv: []});
var Mailer = require(relativeToServer + 'common/mailer');
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

    it('returns error when read file fails', function (done) {
        Mailer.sendEmail({}, 'path', {})
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


    it('sends an email', function (done) {
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
        Mailer.sendEmail(options, relativeToServer + 'users/welcome.hbs.md', payload)
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

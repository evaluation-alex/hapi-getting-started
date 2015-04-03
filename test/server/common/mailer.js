'use strict';
let relativeToServer = './../../../server/';
let relativeTo = './../../../';
let Config = require(relativeTo + 'config');
let Mailer = require(relativeToServer + 'common/plugins/mailer');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let expect = Code.expect;
describe('Mailer', function () {
    it('returns error when read file fails', function (done) {
        Mailer.sendEmail({}, 'path', {})
            .then(function (info) {
                expect(info).to.not.exist();
                done(info);
            })
            .catch(function (err) {
                expect(err).to.be.an.instanceof(Error);
                done();
            })
            .done();
    });
    it('sends an email, if sent repeatedly, hits the cache', function (done) {
        let options = {
            subject: 'Your ' + Config.projectName + ' account',
            to: {
                name: Config.smtpUsername,
                address: Config.smtpUsername
            }
        };
        let payload = {
            email: 'email',
            password: 'password'
        };
        Mailer.sendEmail(options, 'server/users/templates/welcome.hbs.md', payload)
            .then(function (info) {
                expect(info).to.exist();
            })
            .then(function () {
                return Mailer.sendEmail(options, 'server/users/templates/welcome.hbs.md', payload);
            })
            .then(function (info) {
                expect(info).to.exist();
                done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                done(err);
            });
    });
});

'use strict';
let Config = require('./../../../build/server/config');
let Mailer = require('./../../../build/server/plugins/mailer');
let expect = require('chai').expect;
describe('Mailer', () => {
    it('returns error when read file fails', (done) => {
        Mailer.sendEmail({}, 'path', {})
            .then((info) => {
                expect(info).to.not.exist;
                done(info);
            })
            .catch((err) => {
                expect(err).to.be.an.instanceof(Error);
                done();
            });
    });
    it('sends an email, if sent repeatedly, hits the cache', (done) => {
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
        Mailer.sendEmail(options, 'src/server/users/templates/welcome.hbs.md', payload)
            .then((info) => {
                expect(info).to.exist;
            })
            .then(() => {
                return Mailer.sendEmail(options, 'src/server/users/templates/welcome.hbs.md', payload);
            })
            .then((info) => {
                expect(info).to.exist;
                done();
            })
            .catch((err) => {
                expect(err).to.not.exist;
                done(err);
            });
    });
});

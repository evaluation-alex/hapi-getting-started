'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let tu = require('./../testutils');
let Fs = require('fs');
let expect = require('chai').expect;
describe('Contact', () => {
    let server;
    before((done) => {
        tu.setupServer()
            .then((res) => {
                server = res.server;
                done();
            })
            .catch((err) => {
                if (err) {
                    done(err);
                }
            })
            .done();
    });
    it('returns an error when send email fails', (done) => {
        Fs.renameSync('./build/web/contact/contact.hbs.md', './build/web/contact/contact2.hbs.md');
        let request = {
            method: 'POST',
            url: '/contact',
            payload: {
                name: 'Toast Man',
                email: 'mr@toast.show',
                message: 'I love you man.'
            }
        };
        server.injectThen(request).then((response) => {
            Fs.renameSync('./build/web/contact/contact2.hbs.md', './build/web/contact/contact.hbs.md');
            expect(response.statusCode).to.equal(500);
            done();
        }).catch((err) => {
            done(err);
        });
    });
    it('returns success after sending an email', (done) => {
        let request = {
            method: 'POST',
            url: '/contact',
            payload: {
                name: 'Toast Man',
                email: 'mr@toast.show',
                message: 'I love you man.'
            }
        };
        server.injectThen(request).then((response) => {
            expect(response.statusCode).to.equal(200);
            done();
        }).catch((err) => {
            done(err);
        });
    });
});

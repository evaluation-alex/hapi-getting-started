'use strict';
let tu = require('./../testutils');
let Fs = require('fs');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let expect = Code.expect;
describe('Contact', () => {
    let server;
    before((done) =>  {
        tu.setupServer()
            .then((res) =>  {
                server = res.server;
                done();
            })
            .catch((err) =>  {
                if (err) {
                    done(err);
                }
            })
            .done();
    });
    it('returns an error when send email fails', (done) =>  {
        Fs.renameSync('./server/contact/contact.hbs.md', './server/contact/contact2.hbs.md');
        let request = {
            method: 'POST',
            url: '/contact',
            payload: {
                name: 'Toast Man',
                email: 'mr@toast.show',
                message: 'I love you man.'
            }
        };
        server.inject(request, (response) =>  {
            try {
                expect(response.statusCode).to.equal(500);
                Fs.renameSync('./server/contact/contact2.hbs.md', './server/contact/contact.hbs.md');
                done();
            } catch (err) {
                done(err);
            }
        });
    });
    it('returns success after sending an email', (done) =>  {
        let request = {
            method: 'POST',
            url: '/contact',
            payload: {
                name: 'Toast Man',
                email: 'mr@toast.show',
                message: 'I love you man.'
            }
        };
        server.inject(request, (response) =>  {
            try {
                expect(response.statusCode).to.equal(200);
                done();
            } catch (err) {
                done(err);
            }
        });
    });
});

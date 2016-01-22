'use strict';
let tu = require('./../../testutils');
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
            .catch(done);
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
        })
            .catch(done);
    });
});

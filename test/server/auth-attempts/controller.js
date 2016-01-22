'use strict';
let AuthAttempts = require('./../../../build/auth-attempts/model');
let Bluebird = require('bluebird');
let tu = require('./../testutils');
let expect = require('chai').expect;
describe('AuthAttempts', () => {
    let authheader = '';
    let server = null;
    before((done) => {
        tu.setupServer()
            .then((res) => {
                server = res.server;
                authheader = res.authheader;
                done();
            })
            .catch(done);
    });
    describe('GET /auth-attempts', () => {
        it('should give auth-attempts of only the ip and email sent in the parameters', (done) => {
            AuthAttempts.create('127.0.0.2', 'test.abuse.find@auth.attempts')
                .then(() => {
                    let request = {
                        method: 'GET',
                        url: '/auth-attempts?ip=127.0.0.2&email=test.abuse.find',
                        headers: {
                            Authorization: authheader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist;
                    expect(response.payload).to.contain('test.abuse.find');
                    expect(response.payload).to.contain('127.0.0.2');
                    done();
                })
                .catch(done);
        });
        it('should give all auth-attempts if nothing is passed', (done) => {
            let authSpam = [];
            for (let i = 0; i < 50; i++) {
                let randomUsername = 'test.abuse' + i + '@auth.attempts';
                authSpam.push(AuthAttempts.create('127.0.0.2', randomUsername));
            }
            Bluebird.all(authSpam)
                .then(() => {
                    let request = {
                        method: 'GET',
                        url: '/auth-attempts',
                        headers: {
                            Authorization: authheader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist;
                    expect(response.payload).to.match(/test.abuse/);
                    expect(response.payload).to.contain('127.0.0.2');
                    done();
                })
                .catch(done);
        });
    });
    after((done) => {
        return tu.cleanup({}, done);
    });
});

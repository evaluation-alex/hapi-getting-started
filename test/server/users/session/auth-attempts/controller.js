'use strict';
let relativeToServer = './../../../../../server/';
let AuthAttempts = require(relativeToServer + '/users/session/auth-attempts/model');
var Promise = require('bluebird');
//let expect = require('chai').expect;
let Code = require('code');   // assertion library
let Lab = require('lab');
let tu = require('./../../../testutils');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('AuthAttempts', function () {
    let authheader = '';
    let server = null;
    before(function (done) {
        tu.setupServer()
            .then(function (res) {
                server = res.server;
                authheader = res.authheader;
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();
    });
    describe('GET /auth-attempts', function () {
        it('should give auth-attempts of only the ip and email sent in the parameters', function (done) {
            AuthAttempts.create('127.0.0.2', 'test.abuse.find@auth.attempts')
                .then(function () {
                    let request = {
                        method: 'GET',
                        url: '/auth-attempts?ip=127.0.0.2&email=test.abuse.find',
                        headers: {
                            Authorization: authheader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            expect(response.payload).to.exist();
                            expect(response.payload).to.contain('test.abuse.find');
                            expect(response.payload).to.contain('127.0.0.2');
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
        it('should give all auth-attempts if nothing is passed', function (done) {
            let authSpam = [];
            for (let i = 0; i < 50; i++) {
                let randomUsername = 'test.abuse' + i + '@auth.attempts';
                authSpam.push(AuthAttempts.create('127.0.0.2', randomUsername));
            }
            Promise.all(authSpam)
                .then(function () {
                    let request = {
                        method: 'GET',
                        url: '/auth-attempts',
                        headers: {
                            Authorization: authheader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            expect(response.payload).to.exist();
                            expect(response.payload).to.match(/test.abuse/);
                            expect(response.payload).to.contain('127.0.0.2');
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
    });
    after(function (done) {
        return tu.cleanup({}, done);
    });
});


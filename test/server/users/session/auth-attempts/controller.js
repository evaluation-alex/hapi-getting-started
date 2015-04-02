'use strict';
var relativeToServer = './../../../../../server/';
var AuthAttempts = require(relativeToServer + '/users/session/auth-attempts/model');
var Promise = require('bluebird');
//var expect = require('chai').expect;
var Code = require('code');   // assertion library
var Lab = require('lab');
var tu = require('./../../../testutils');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;
describe('AuthAttempts', function () {
    var authheader = '';
    var server = null;
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
                    var request = {
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
            var authSpam = [];
            var authRequest = function () {
                return new Promise(function (resolve/*, reject*/) {
                    var randomUsername = 'test.abuse' + i + '@auth.attempts';
                    resolve(AuthAttempts.create('127.0.0.2', randomUsername));
                });
            };
            for (var i = 0; i < 50; i++) {
                authSpam.push(authRequest());
            }
            Promise.all(authSpam)
                .then(function () {
                    var request = {
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


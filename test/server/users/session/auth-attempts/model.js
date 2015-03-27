'use strict';
var relativeToServer = './../../../../../server/';
var relativeTo = './../../../../../';

var Config = require(relativeTo + 'config');
var AuthAttempts = require(relativeToServer + '/users/session/auth-attempts/model');
//var expect = require('chai').expect;
var tu = require('./../../../testutils');
var Promise = require('bluebird');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

describe('AuthAttempts Model', function () {

    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function () {
                done();
            });
    });

    it('returns a new instance when create succeeds', function (done) {
        var error;
        AuthAttempts.create('127.0.0.1', 'test.create@auth.attempts')
            .then(function (authAttempt) {
                expect(authAttempt).to.be.an.instanceof(AuthAttempts);
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                tu.testComplete(done, error);
            });
    });

    it('should return true when abuse is detected for user + ip combo', function (done) {
        var error;
        var authAttemptsConfig = Config.authAttempts;
        var authSpam = [];
        var authRequest = function () {
            return new Promise(function (resolve/*, reject*/) {
                AuthAttempts.create('127.0.0.1', 'test.abuse@auth.attempts')
                    .then(function (result) {
                        expect(result).to.be.an.instanceof(AuthAttempts);
                        resolve(true);
                    })
                    .catch(function (err) {
                        expect(err).to.not.exist();
                        resolve(false);
                    });
            });
        };
        for (var i = 0; i < authAttemptsConfig.forIpAndUser + 1; i++) {
            authSpam.push(authRequest());
        }
        Promise.all(authSpam)
            .then(function () {
                return AuthAttempts.abuseDetected('127.0.0.1', 'test.abuse@auth.attempts');
            })
            .then(function (result) {
                expect(result).to.equal(true);
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                tu.testComplete(done, error);
            });
    });

    it('should return true when abuse is detected for an ip and multiple users', function (done) {
        var error;
        var authAttemptsConfig = Config.authAttempts;
        var authSpam = [];
        var authRequest = function () {
            return new Promise(function (resolve/*, reject*/) {
                var randomUsername = 'test.abuse' + i + '@auth.attempts';
                AuthAttempts.create('127.0.0.2', randomUsername)
                    .then(function (result) {
                        expect(result).to.be.an.instanceof(AuthAttempts);
                        resolve(true);
                    })
                    .catch(function (err) {
                        expect(err).to.not.exist();
                        resolve(false);
                    });
            });
        };

        for (var i = 0; i < authAttemptsConfig.forIp + 2; i++) {
            authSpam.push(authRequest());
        }
        Promise.all(authSpam)
            .then(function () {
                return AuthAttempts.abuseDetected('127.0.0.2', 'test.abusexxx@auth.attempts');
            })
            .then(function (result) {
                expect(result).to.equal(true);
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                tu.testComplete(done, error);
            });
    });

    after(function (done) {
        return tu.cleanup({}, done);
    });

});

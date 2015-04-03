'use strict';
let relativeToServer = './../../../../../server/';
let relativeTo = './../../../../../';
let Config = require(relativeTo + 'config');
let AuthAttempts = require(relativeToServer + '/users/session/auth-attempts/model');
let tu = require('./../../../testutils');
let Promise = require('bluebird');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('AuthAttempts Model', function () {
    before(function (done) {
        tu.setupRolesAndUsers()
            .then(() =>  {
                done();
            });
    });
    it('returns a new instance when create succeeds', function (done) {
        let error;
        AuthAttempts.create('127.0.0.1', 'test.create@auth.attempts')
            .then((authAttempt) =>  {
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
        let error;
        let authAttemptsConfig = Config.authAttempts;
        let authSpam = [];
        let authRequest = function () {
            return new Promise(function (resolve/*, reject*/) {
                AuthAttempts.create('127.0.0.1', 'test.abuse@auth.attempts')
                    .then((result) =>  {
                        expect(result).to.be.an.instanceof(AuthAttempts);
                        resolve(true);
                    })
                    .catch(function (err) {
                        expect(err).to.not.exist();
                        resolve(false);
                    });
            });
        };
        for (let i = 0; i < authAttemptsConfig.forIpAndUser + 1; i++) {
            authSpam.push(authRequest());
        }
        Promise.all(authSpam)
            .then(() =>  {
                return AuthAttempts.abuseDetected('127.0.0.1', 'test.abuse@auth.attempts');
            })
            .then((result) =>  {
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
        let error;
        let authAttemptsConfig = Config.authAttempts;
        let authSpam = [];
        for (let i = 0; i < authAttemptsConfig.forIp + 2; i++) {
            let randomUsername = 'test.abuse' + i + '@auth.attempts';
            authSpam.push(AuthAttempts.create('127.0.0.2', randomUsername));
        }
        Promise.all(authSpam)
            .then(() =>  {
                return AuthAttempts.abuseDetected('127.0.0.2', 'test.abusexxx@auth.attempts');
            })
            .then((result) =>  {
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

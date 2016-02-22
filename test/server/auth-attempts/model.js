'use strict';
let Config = require('./../../../build/server/config');
let AuthAttempts = require('./../../../build/server/auth-attempts/model');
let tu = require('./../testutils');
let Bluebird = require('bluebird');
let expect = require('chai').expect;
describe('AuthAttempts DAO', () => {
    before((done) => {
        tu.setupRolesAndUsers()
            .then(() => {
                done();
            });
    });
    it('returns a new instance when create succeeds', (done) => {
        let error;
        AuthAttempts.create('127.0.0.1', 'test.create@auth.attempts')
            .then((authAttempt) => {
                expect(authAttempt).to.be.an.instanceof(AuthAttempts);
            })
            .catch((err) => {
                expect(err).to.not.exist;
                error = err;
            })
            .finally(() => {
                tu.testComplete(done, error);
            });
    });
    it('should return true when abuse is detected for user + ip combo', (done) => {
        let error;
        let authAttemptsConfig = Config.authAttempts;
        let authSpam = [];
        let authRequest = () => {
            return new Bluebird((resolve/*, reject*/) => {
                AuthAttempts.create('127.0.0.1', 'test.abuse@auth.attempts')
                    .then((result) => {
                        expect(result).to.be.an.instanceof(AuthAttempts);
                        resolve(true);
                    })
                    .catch((err) => {
                        expect(err).to.not.exist;
                        resolve(false);
                    });
            });
        };
        for (let i = 0; i < authAttemptsConfig.forIpAndUser + 1; i++) {
            authSpam.push(authRequest());
        }
        Bluebird.all(authSpam)
            .then(() => {
                return AuthAttempts.abuseDetected('127.0.0.1', 'test.abuse@auth.attempts');
            })
            .then((result) => {
                expect(result).to.equal(true);
            })
            .catch((err) => {
                expect(err).to.not.exist;
                error = err;
            })
            .finally(() => {
                tu.testComplete(done, error);
            });
    });
    it('should return true when abuse is detected for an ip and multiple users', (done) => {
        let error;
        let authAttemptsConfig = Config.authAttempts;
        let authSpam = [];
        for (let i = 0; i < authAttemptsConfig.forIp + 2; i++) {
            let randomUsername = 'test.abuse' + i + '@auth.attempts';
            authSpam.push(AuthAttempts.create('127.0.0.2', randomUsername));
        }
        Bluebird.all(authSpam)
            .then(() => {
                return AuthAttempts.abuseDetected('127.0.0.2', 'test.abusexxx@auth.attempts');
            })
            .then((result) => {
                expect(result).to.equal(true);
            })
            .catch((err) => {
                expect(err).to.not.exist;
                error = err;
            })
            .finally(() => {
                tu.testComplete(done, error);
            });
    });
    after((done) => {
        return tu.cleanup({}, done);
    });
});

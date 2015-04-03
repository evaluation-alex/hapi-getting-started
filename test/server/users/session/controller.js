'use strict';
let relativeToServer = './../../../../server/';
let relativeTo = './../../../../';
let Config = require(relativeTo + 'config');
let Users = require(relativeToServer + 'users/model');
let Audit = require(relativeToServer + 'audit/model');
var Promise = require('bluebird');
let AuthAttempts = require(relativeToServer + 'users/session/auth-attempts/model');
let tu = require('./../../testutils');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Session', function () {
    let server = null;
    let emails = [];
    before(function (done) {
        tu.setupServer()
            .then((res) =>  {
                server = res.server;
            })
            .then(() =>  {
                emails.push('test.users@test.api');
                return Users.create('test.users@test.api', 'silver lining', 'password123', 'en');
            })
            .then((newUser) =>  {
                newUser.loginSuccess('test', 'test').save();
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });
    describe('POST /session', function () {
        it('returns early when abuse is detected', function (done) {
            let authAttemptsConfig = Config.authAttempts;
            let authSpam = [];
            for (let i = 0; i < authAttemptsConfig.forIpAndUser + 1; i++) {
                authSpam.push(AuthAttempts.create('test', 'test.users@test.api'));
            }
            Promise.all(authSpam)
                .then(() =>  {
                    let request = {
                        method: 'POST',
                        url: '/session',
                        payload: {
                            email: 'test.users@test.api',
                            password: 'password123'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(429);
                            tu.cleanupAuthAttempts();
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
        it('returns an error when you pass incorrect credentials', function (done) {
            let request = {
                method: 'POST',
                url: '/session',
                payload: {
                    email: 'test.users@test.api',
                    password: 'bogus'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(401);
                    AuthAttempts.find({email: 'test.users@test.api'})
                        .then((aa) =>  {
                            expect(aa).to.exist();
                            expect(aa.length).to.equal(1);
                            return Audit.findAudit('users', 'test.users@test.api', {'change.action': 'login fail'});
                        })
                        .then((foundAudit) =>  {
                            expect(foundAudit).to.exist();
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });
        it('returns an error when you pass non existent user', function (done) {
            let request = {
                method: 'POST',
                url: '/session',
                payload: {
                    email: 'test.unknown@test.api',
                    password: 'bogus'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(404);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('returns a session successfully', function (done) {
            let request = {
                method: 'POST',
                url: '/session',
                payload: {
                    email: 'test.users@test.api',
                    password: 'password123'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist();
                    expect(response.payload).to.contain('test.users@test.api');
                    Audit.findAudit('users', 'test.users@test.api', {'change.action': 'login success'})
                        .then((foundAudit) =>  {
                            expect(foundAudit).to.exist();
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });
    });
    describe('DELETE /session', function () {
        it('returns an error when no authorization is passed', function (done) {
            let request = {
                method: 'DELETE',
                url: '/session'
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(401);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('returns a not found when user does not exist', function (done) {
            let request = {
                method: 'DELETE',
                url: '/session',
                headers: {
                    Authorization: tu.authorizationHeader2('test.not.created@logout.api', '123')
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(404);
                    emails.push('test.not.created@logout.api');
                    done();
                } catch (err) {
                    emails.push('test.not.created@logout.api');
                    done(err);
                }
            });
        });
        it('returns a not found when user has already logged out', function (done) {
            let request = {
                method: 'DELETE',
                url: '/session',
                headers: {
                    Authorization: ''
                }
            };
            tu.findAndLogin('one@first.com')
                .then((u) =>  {
                    request.headers.Authorization = u.authheader;
                    return u.user.logout('test', 'test').save();
                })
                .done();
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(401);
                    Users.findOne({email: 'one@first.com'})
                        .then((foundUser) =>  {
                            foundUser.loginSuccess('test', 'test').save();
                            done();
                        })
                        .done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('removes the authenticated user session successfully', function (done) {
            tu.findAndLogin('one@first.com')
                .then((u) =>  {
                    let request = {
                        method: 'DELETE',
                        url: '/session',
                        headers: {
                            Authorization: ''
                        }
                    };
                    request.headers.Authorization = u.authheader;
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Users.findOne({email: 'one@first.com'})
                                .then((foundUser) =>  {
                                    expect(foundUser.session.length).to.equal(0);
                                    foundUser.loginSuccess('test', 'test').save();
                                    done();
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
    });
    after(function (done) {
        return tu.cleanup({users: emails}, done);
    });
});


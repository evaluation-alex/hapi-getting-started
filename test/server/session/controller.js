'use strict';
var relativeToServer = './../../../server/';
var relativeTo = './../../../';

var Config = require(relativeTo + 'config');
var Users = require(relativeToServer + 'users/model');
var Audit = require(relativeToServer + 'audit/model');
var Promise = require('bluebird');
var AuthAttempts = require(relativeToServer + 'auth-attempts/model');
//var expect = require('chai').expect;
var tu = require('./../testutils');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe('Session', function () {
    var server = null;
    var emails = [];

    beforeEach(function (done) {
        tu.setupServer()
            .then(function (res) {
                server = res.server;
            })
            .then(function () {
                emails.push('test.users@test.api');
                return Users.create('test.users@test.api', 'password123', 'silver lining');
            })
            .then(function (newUser) {
                newUser.loginSuccess('test', 'test').save();
                done();
            })
            .catch(function (err) {
                    done(err);
            })
            .done();
    });

    describe('POST /login', function () {
        it('returns early when abuse is detected', function (done) {
            var authAttemptsConfig = Config.authAttempts;
            var authSpam = [];
            var authRequest = function () {
                return new Promise(function (resolve/*, reject*/) {
                    AuthAttempts.create('', 'test.users@test.api')
                        .then(function () {
                            resolve(true);
                        })
                        .catch(function () {
                            resolve(false);
                        });
                });
            };
            for (var i = 0; i < authAttemptsConfig.forIpAndUser + 1; i++) {
                authSpam.push(authRequest());
            }
            Promise.all(authSpam)
                .then(function () {
                    var request = {
                        method: 'POST',
                        url: '/login',
                        payload: {
                            email: 'test.users@test.api',
                            password: 'password123'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(429);
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        it('returns an error when you pass incorrect credentials', function (done) {
            var request = {
                method: 'POST',
                url: '/login',
                payload: {
                    email: 'test.users@test.api',
                    password: 'bogus'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(401);
                    AuthAttempts._find({email: 'test.users@test.api'})
                        .then(function (aa) {
                            expect(aa).to.exist();
                            expect(aa.length).to.equal(1);
                            return Audit.findAudit('users', 'test.users@test.api', {'change.action': 'login fail'});
                        })
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });

        it('returns an error when you pass non existent user', function (done) {
            var request = {
                method: 'POST',
                url: '/login',
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
            var request = {
                method: 'POST',
                url: '/login',
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
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });
    });

    describe('DELETE /logout', function () {
        it('returns an error when no authorization is passed', function (done) {
            var request = {
                method: 'DELETE',
                url: '/logout'
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
            var request = {
                method: 'DELETE',
                url: '/logout',
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
            var request = {
                method: 'DELETE',
                url: '/logout',
                headers: {
                    Authorization: ''
                }
            };
            Users._findOne({email: 'one@first.com'})
                .then(function (foundUser) {
                    return foundUser.loginSuccess('test', 'test').save();
                })
                .then(function (foundUser) {
                    request.headers.Authorization = tu.authorizationHeader(foundUser);
                    return foundUser.logout('test', 'test').save();
                })
                .done();
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(401);
                    Users._findOne({email: 'one@first.com'})
                        .then(function (foundUser) {
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
            Users._findOne({email: 'one@first.com'})
                .then(function (foundUser) {
                    return foundUser.loginSuccess('test', 'test').save();
                }).
                then(function (foundUser) {
                    var request = {
                        method: 'DELETE',
                        url: '/logout',
                        headers: {
                            Authorization: ''
                        }
                    };
                    request.headers.Authorization = tu.authorizationHeader(foundUser);
                    return request;
                })
                .then(function (request) {
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Users._findOne({email: 'one@first.com'})
                                .then(function (foundUser) {
                                    expect(foundUser.session).to.not.exist();
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

    afterEach(function (done) {
        return tu.cleanup({ users: emails}, done);
    });
});



'use strict';
var Config = require('./../../../config').config({argv: []});
var Hapi = require('hapi');
var LoginPlugin = require('./../../../server/api/login');
var MailerPlugin = require('./../../../server/mailer');
var Promise = require('bluebird');
//var expect = require('chai').expect;
var tu = require('./../testutils');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe('Login', function () {
    var server = null;
    var emails = [];
    beforeEach(function (done) {
       var plugins = [MailerPlugin, LoginPlugin];
        server = tu.setupServer(plugins)
            .then(function (s) {
                server = s;
                return tu.setupRolesAndUsers();
            })
            .then(function () {
                var Users = server.plugins['hapi-mongo-models'].Users;
                emails.push('test.users@test.api');
                return Users.create('test.users@test.api', 'password123');
            })
            .then(function (newUser) {
                newUser.loginSuccess('test', 'test').done();
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();
    });

    describe('POST /login', function () {
        it('returns early when abuse is detected', function (done) {
            var authAttemptsConfig = Config.authAttempts;
            var authSpam = [];
            var authRequest = function () {
                var promise = new Promise(function (resolve, reject) {
                    var AuthAttempts = server.plugins['hapi-mongo-models'].AuthAttempts;
                    AuthAttempts.create('', 'test.users@test.api')
                        .then(function (result) {
                            resolve(true);
                        })
                        .catch(function (err) {
                            resolve(false);
                        });
                });
                return promise;
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
                    var Audit = server.plugins['hapi-mongo-models'].Audit;
                    Audit.findUsersAudit({userId: 'test.users@test.api', action: 'login fail'})
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                        });
                    done();
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
                    var Audit = server.plugins['hapi-mongo-models'].Audit;
                    Audit.findUsersAudit({userId: 'test.users@test.api', action: 'login success'})
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                        });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
    });

    describe('POST /login/forgot', function () {
        it('returns an error when user does not exist', function (done) {
            var request = {
                method: 'POST',
                url: '/login/forgot',
                payload: {
                    email: 'test.unknown@test.api'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.contain('Success');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('successfully sends a reset password request', function (done) {
            var request = {
                method: 'POST',
                url: '/login/forgot',
                payload: {
                    email: 'test.users@test.api'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.contain('Success');
                    var Audit = server.plugins['hapi-mongo-models'].Audit;
                    var Users = server.plugins['hapi-mongo-models'].Users;
                    Audit.findUsersAudit({userId: 'test.users@test.api', action: 'reset password sent'})
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            return Users._findOne({email: 'test.users@test.api'});
                        })
                        .then(function (foundUser) {
                            expect(foundUser.resetPwd).to.exist();
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });
    });

    describe('POST /login/reset', function () {
        it('returns an error when user does not exist', function (done) {
            var request = {
                method: 'POST',
                url: '/login/reset',
                payload: {
                    key: 'abcdefgh-ijkl-mnop-qrst-uvwxyz123456',
                    email: 'test.unkown@test.api',
                    password: 'random'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(400);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('returns a bad request if the key does not match', function (done) {
            var request = {
                method: 'POST',
                url: '/login/reset',
                payload: {
                    key: 'abcdefgh-ijkl-mnop-qrst-uvwxyz123456',
                    email: 'test.users@test.api',
                    password: 'password1234'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(400);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('successfully sets a password, invalidates session and logs user out', function (done) {
            var Users = server.plugins['hapi-mongo-models'].Users;
            var key = '';
            Users._findOne({email: 'test.users@test.api'})
                .then(function (foundUser) {
                    foundUser.resetPasswordSent('test');
                    key = foundUser.resetPwd.token;
                })
                .then(function () {
                    var request = {
                        method: 'POST',
                        url: '/login/reset',
                        payload: {
                            key: key,
                            email: 'test.users@test.api',
                            password: 'password1234'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            expect(response.payload).to.contain('Success');
                            var Audit = server.plugins['hapi-mongo-models'].Audit;
                            Audit.findUsersAudit({userId: 'test.users@test.api', action: 'reset password'})
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    return Users._findOne({email: 'test.users@test.api'});
                                })
                                .then(function (foundUser) {
                                    expect(foundUser.resetPwd).to.be.empty();
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
        tu.cleanup(emails, null, null, done);
    });
});

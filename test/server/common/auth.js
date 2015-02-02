'use strict';
var relativeToServer = './../../../server/';
var relativeTo = './../../../';

var Users = require(relativeToServer + 'users/model');
var AuthPlugin = require(relativeToServer + 'common/auth');
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

describe('Auth', function () {
    var server;
    var email = 'test.auth@plugin.auth';
    var authheader;

    beforeEach(function (done) {
        server = tu.setupServer()
            .then(function (s) {
                server = s;
                return tu.setupRolesAndUsers();
            })
            .then(function () {
                return Users.create(email, 'auth123');
            })
            .then(function (user) {
                user.loginSuccess('test', 'test').done();
                authheader = tu.authorizationHeader(user);
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();
    });

    it('returns authentication credentials when correct authorization header is sent in the request', function (done) {
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {
                server.auth.test('simple', request, function (err, credentials) {
                    expect(err).to.not.exist();
                    expect(credentials).to.exist();
                    expect(credentials.user).to.be.an.instanceof(Users);
                    reply('ok').takeover();
                });
            }
        });

        var request = {
            method: 'GET',
            url: '/',
            headers: {
                Authorization: authheader
            }
        };
        server.inject(request, function (response) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('returns an error when the session is not found', function (done) {
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {
                server.auth.test('simple', request, function (err, credentials) {
                    expect(err).to.be.an.instanceof(Error);
                    expect(credentials).to.not.exist();
                    reply('ok').takeover();
                });
            }
        });

        var request = {
            method: 'GET',
            url: '/',
            headers: {
                Authorization: tu.authorizationHeader2(email, 'randomsessionkey')
            }
        };

        server.inject(request, function (response) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('returns an error when the user is not found', function (done) {
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {
                server.auth.test('simple', request, function (err, credentials) {
                    expect(err).to.be.an.instanceof(Error);
                    expect(credentials).to.not.exist();
                    reply('ok').takeover();
                });
            }
        });

        var request = {
            method: 'GET',
            url: '/',
            headers: {
                Authorization: tu.authorizationHeader2('unknown@test.auth', 'doesnt matter')
            }
        };

        server.inject(request, function (response) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('returns an error when user has already logged out', function (done) {
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {
                server.auth.test('simple', request, function (err, credentials) {
                    expect(err).to.be.an.instanceof(Error);
                    expect(credentials).to.not.exist();
                    reply('ok');
                });
            }
        });

        Users.findByEmail(email)
            .then(function (user) {
                user.logout('test', 'test').done();
            })
            .then(function () {
                var request = {
                    method: 'GET',
                    url: '/',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function (response) {
                    try {
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            })
            .done();
    });

    it('returns with 403 when the required role(s) are missing', function (done) {
        server.route({
            method: 'GET',
            path: '/',
            config: {
                auth: {
                    strategy: 'simple'
                },
                pre: [
                    AuthPlugin.preware.ensurePermissions('view', 'users')
                ]
            },
            handler: function (request, reply) {
                expect(request.auth.credentials).to.exist();
                reply('ok').statusCode(200).takeover();
            }
        });

        Users.findByEmail(email)
            .then(function (user) {
                user.updateRoles([], 'test').done();
                user.loginSuccess('test', 'test').done();
                authheader = tu.authorizationHeader2(email, user.session.key);
                var request = {
                    method: 'GET',
                    url: '/',
                    headers: {
                        authorization: authheader
                    }
                };

                server.inject(request, function (response) {
                    try {
                        expect(response.statusCode).to.equal(403);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            })
            .done();
    });

    it('returns with 403 when the required permissions are missing on the role', function (done) {
        server.route({
            method: 'GET',
            path: '/',
            config: {
                auth: {
                    strategy: 'simple'
                },
                pre: [
                    AuthPlugin.preware.ensurePermissions('update', 'users')
                ]
            },
            handler: function (request, reply) {
                expect(request.auth.credentials).to.exist();
                reply('ok').statusCode(200).takeover();
            }
        });

        var request = {
            method: 'GET',
            url: '/',
            headers: {
                authorization: authheader
            }
        };

        server.inject(request, function (response) {
            try {
                expect(response.statusCode).to.equal(403);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    afterEach(function (done) {
        tu.cleanup([email], null, null, done);
    });
});


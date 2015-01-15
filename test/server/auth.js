'use strict';
var Hapi = require('hapi');
var HapiAuthBasic = require('hapi-auth-basic');
var HapiMongoModels = require('hapi-mongo-models');
var AuthPlugin = require('./../../server/auth');
var Config = require('./../../config').config({argv: []});
//var expect = require('chai').expect;
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
    var ModelsPlugin;
    var server;
    var email = 'test.auth@plugin.auth';
    var authheader;

    var authorizationHeader = function (user, password) {
        return 'Basic ' + (new Buffer(user + ':' + password)).toString('base64');
    };

    beforeEach(function (done) {
        var Manifest = require('./../../manifest').manifest;
        ModelsPlugin = {
            register: HapiMongoModels,
            options: JSON.parse(JSON.stringify(Manifest)).plugins['hapi-mongo-models']
        };

        var plugins = [HapiAuthBasic, ModelsPlugin, AuthPlugin];
        server = new Hapi.Server();
        server.connection({port: Config.port});
        server.register(plugins, function (err) {
            if (err) {
                throw err;
            }
            var Users = server.plugins['hapi-mongo-models'].Users;
            Users.create(email, 'auth123')
                .then(function (user) {
                    user.loginSuccess('test', 'test').done();
                    authheader = authorizationHeader(email, user.session.key);
                })
                .catch(function (err) {
                    throw err;
                })
                .done(function () {
                    done();
                });
        });
    });

    it('returns authentication credentials when correct authorization header is sent in the request', function (done) {
        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {
                server.auth.test('simple', request, function (err, credentials) {
                    expect(err).to.not.exist();
                    expect(credentials).to.exist();
                    expect(credentials.user).to.be.an.instanceof(server.plugins['hapi-mongo-models'].Users);
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
            done();
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
                Authorization: authorizationHeader(email, 'randomsessionkey')
            }
        };

        server.inject(request, function (response) {
            done();
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
                    reply('ok').statusCode(200).takeover();
                });
            }
        });

        var request = {
            method: 'GET',
            url: '/',
            headers: {
                Authorization: authorizationHeader('unknown@test.auth', 'doesnt matter')
            }
        };

        server.inject(request, function (response) {
            done();
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

        var Users = server.plugins['hapi-mongo-models'].Users;
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
                    done();
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

        var Users = server.plugins['hapi-mongo-models'].Users;
        Users.findByEmail(email)
            .then(function (user) {
                user.updateRoles([], 'test').done();
                user.loginSuccess('test', 'test').done();
                authheader = authorizationHeader(email, user.session.key);
                var request = {
                    method: 'GET',
                    url: '/',
                    headers: {
                        authorization: authheader
                    }
                };

                server.inject(request, function (response) {
                    expect(response.statusCode).to.equal(403);
                    done();
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
            expect(response.statusCode).to.equal(403);
            done();
        });
    });

    afterEach(function (done) {
        var Users = server.plugins['hapi-mongo-models'].Users;
        var Audit = server.plugins['hapi-mongo-models'].Audit;
        Users.remove({email: email}, function (err, result) {
            if (err) {
                throw err;
            }
            Audit.remove({objectChangedId: email}, function (err, result) {
                if (err) {
                    throw err;
                }
                done();
            });
        });
    });
});


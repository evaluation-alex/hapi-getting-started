'use strict';
var relativeToServer = './../../../server/';
var Users = require(relativeToServer + 'users/model');
var Promise = require('bluebird');
var moment = require('moment');
//var expect = require('chai').expect;
var tu = require('./../testutils');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;
describe('Auth', function () {
    var server;
    var email = 'test.auth@plugin.auth';
    var authheader;
    before(function (done) {
        tu.setupServer()
            .then(function (res) {
                server = res.server;
            })
            .then(function () {
                return Users.create(email, 'silver lining', 'auth123', 'en');
            })
            .then(function () {
                return tu.findAndLogin(email);
            })
            .then(function (u) {
                authheader = u.authheader;
            })
            .then(function () {
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
                    expect(credentials.user._roles).to.exist();
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
        server.inject(request, function () {
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
            path: '/0',
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
            url: '/0',
            headers: {
                Authorization: tu.authorizationHeader2(email, 'randomsessionkey')
            }
        };
        server.inject(request, function () {
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
            path: '/1',
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
            url: '/1',
            headers: {
                Authorization: tu.authorizationHeader2('unknown@test.auth', 'doesnt matter')
            }
        };
        server.inject(request, function () {
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
            path: '/2',
            handler: function (request, reply) {
                server.auth.test('simple', request, function (err, credentials) {
                    expect(err).to.be.an.instanceof(Error);
                    expect(credentials).to.not.exist();
                    reply('ok');
                });
            }
        });
        Users.findOne({email: email})
            .then(function (user) {
                return user.logout('test', 'test').save();
            })
            .then(function () {
                var request = {
                    method: 'GET',
                    url: '/2',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function () {
                    try {
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            })
            .done();
    });
    it('returns a session expired when the session has expired', function (done) {
        server.route({
            method: 'GET',
            path: '/5',
            handler: function (request, reply) {
                server.auth.test('simple', request, function (err, credentials) {
                    expect(err).to.be.an.instanceof(Error);
                    expect(credentials).to.not.exist();
                    reply('ok');
                });
            }
        });
        Users.findOne({email: email})
            .then(function (user) {
                user.loginSuccess('test', 'test');
                user.session[0].expires = moment().subtract(15, 'days').toDate();
                return user.save();
            })
            .then(function () {
                var request = {
                    method: 'GET',
                    url: '/5',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function () {
                    try {
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            })
            .done();
    });
    it('does adequate error handling and logging when errors occur', function (done) {
        server.route({
            method: 'GET',
            path: '/6',
            handler: function (request, reply) {
                server.auth.test('simple', request, function (err, credentials) {
                    expect(err).to.be.an.instanceof(Error);
                    expect(credentials).to.not.exist();
                    reply('ok');
                });
            }
        });
        var prev = Users.findBySessionCredentials;
        Users.findBySessionCredentials = function () {
            return Promise.reject(new Error('test'));
        };
        var request = {
            method: 'GET',
            url: '/6',
            headers: {
                Authorization: authheader
            }
        };
        server.inject(request, function () {
            try {
                Users.findBySessionCredentials = prev;
                done();
            } catch (err) {
                Users.findBySessionCredentials = prev;
                done(err);
            }
        });
    });
    after(function (done) {
        return tu.cleanup({users: [email]}, done);
    });
});


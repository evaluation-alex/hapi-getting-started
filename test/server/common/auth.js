'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let Users = require('./../../../build/users/model');
let Bluebird = require('bluebird');
let moment = require('moment');
let tu = require('./../testutils');
let expect = require('chai').expect;
describe('Auth', () => {
    let server;
    let email = 'test.auth@plugin.auth';
    let authheader;
    before((done) => {
        tu.setupServer()
            .then((res) => {
                server = res.server;
            })
            .then(() => {
                return Users.create(email, 'silver lining', 'auth123', 'en');
            })
            .then(() => {
                return tu.findAndLogin(email);
            })
            .then((u) => {
                authheader = u.authheader;
            })
            .then(() => {
                done();
            })
            .catch(done);
    });
    it('returns authentication credentials when correct authorization header is sent in the request', (done) => {
        let request = {
            method: 'GET',
            url: '/testauth',
            headers: {
                Authorization: authheader
            }
        };
        server.route({
            method: 'GET',
            path: '/testauth',
            handler: (rquest, reply) => {
                server.auth.test('simple', rquest, (err, credentials) => {
                    expect(err).to.not.exist;
                    expect(credentials).to.exist;
                    expect(credentials.user).to.be.an.instanceof(Users);
                    expect(credentials.user._roles).to.exist;
                    reply('ok').takeover();
                });
            }
        });
        server.injectThen(request)
            .then(() => {
                done();
            })
            .catch(done);
    });
    it('returns an error when the session is not found', (done) => {
        let request = {
            method: 'GET',
            url: '/0',
            headers: {
                Authorization: tu.authorizationHeader2(email, 'randomsessionkey')
            }
        };
        server.route({
            method: 'GET',
            path: '/0',
            handler: (rquest, reply) => {
                server.auth.test('simple', rquest, (err, credentials) => {
                    expect(err).to.be.an.instanceof(Error);
                    expect(credentials).to.not.exist;
                    reply('ok').takeover();
                });
            }
        });
        server.injectThen(request)
            .then(() => {
                done();
            })
            .catch(done);
    });
    it('returns an error when the user is not found', (done) => {
        let request = {
            method: 'GET',
            url: '/1',
            headers: {
                Authorization: tu.authorizationHeader2('unknown@test.auth', 'doesnt matter')
            }
        };
        server.route({
            method: 'GET',
            path: '/1',
            handler: (rquest, reply) => {
                server.auth.test('simple', rquest, (err, credentials) => {
                    expect(err).to.be.an.instanceof(Error);
                    expect(credentials).to.not.exist;
                    reply('ok').takeover();
                });
            }
        });
        server.injectThen(request)
            .then(() => {
                done();
            })
            .catch(done);
    });
    it('returns an error when user has already logged out', (done) => {
        server.route({
            method: 'GET',
            path: '/2',
            handler: (request, reply) => {
                server.auth.test('simple', request, (err, credentials) => {
                    expect(err).to.be.an.instanceof(Error);
                    expect(credentials).to.not.exist;
                    reply('ok');
                });
            }
        });
        Users.findOne({email: email})
            .then((user) => {
                return user.logout('127.0.0.1', 'test').save();
            })
            .then(() => {
                let request = {
                    method: 'GET',
                    url: '/2',
                    headers: {
                        Authorization: authheader
                    }
                };
                return server.injectThen(request);
            })
            .then(() => {
                done();
            })
            .catch(done);
    });
    it('returns a session expired when the session has expired', (done) => {
        server.route({
            method: 'GET',
            path: '/5',
            handler: (request, reply) => {
                server.auth.test('simple', request, (err, credentials) => {
                    expect(err).to.be.an.instanceof(Error);
                    expect(credentials).to.not.exist;
                    reply('ok');
                });
            }
        });
        Users.findOne({email: email})
            .then((user) => {
                user.loginSuccess('127.0.0.1', 'test');
                user.session[0].expires = moment().subtract(15, 'days').toDate();
                user.__isModified = true;
                return user.save();
            })
            .then(() => {
                let request = {
                    method: 'GET',
                    url: '/5',
                    headers: {
                        Authorization: authheader
                    }
                };
                return server.injectThen(request);
            })
            .then(() => {
                done();
            })
            .catch(done);
    });
    it('does adequate error handling and logging when errors occur', (done) => {
        let request = {
            method: 'GET',
            url: '/6',
            headers: {
                Authorization: authheader
            }
        };
        server.route({
            method: 'GET',
            path: '/6',
            handler: (rquest, reply) => {
                server.auth.test('simple', rquest, (err, credentials) => {
                    expect(err).to.be.an.instanceof(Error);
                    expect(credentials).to.not.exist;
                    reply('ok');
                });
            }
        });
        let prev = Users.findBySessionCredentials;
        Users.findBySessionCredentials = () => {
            return Bluebird.reject(new Error('test'));
        };
        server.injectThen(request)
            .then(() => {
                Users.findBySessionCredentials = prev;
                done();
            })
            .catch((err) => {
                Users.findBySessionCredentials = prev;
                done(err);
            });
    });
    after((done) => {
        return tu.cleanup({users: [email]}, done);
    });
});

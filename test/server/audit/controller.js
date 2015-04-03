'use strict';
let relativeToServer = './../../../server/';
let Users = require(relativeToServer + 'users/model');
//let expect = require('chai').expect;
let Code = require('code');   // assertion library
let Lab = require('lab');
let tu = require('./../testutils');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Audit', function () {
    let authheader = '';
    let server = null;
    let emails = [];
    before(function (done) {
        tu.setupServer()
            .then(function (res) {
                server = res.server;
                authheader = res.authheader;
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();
    });
    describe('GET /audit', function () {
        describe('users', function () {
            before(function (done) {
                Users.create('test.users@test.api', 'silver lining', 'password123', 'en')
                    .then(function (newUser) {
                        return newUser.loginSuccess('test', 'test').save();
                    })
                    .then(function () {
                        return Users.create('test.users2@test.api', 'silver lining', 'password123', 'en');
                    })
                    .then(function (newUser2) {
                        return newUser2.loginSuccess('test', 'test').save();
                    }).then(function (newUser2) {
                        newUser2.deactivate('test').save();
                        emails.push('test.users2@test.api');
                        emails.push('test.users@test.api');
                        done();
                    })
                    .catch(function (err) {
                        emails.push('test.users2@test.api');
                        emails.push('test.users@test.api');
                        done(err);
                    })
                    .done();
            });
            it('should give audit of only the user whose email is sent in the parameter', function (done) {
                let request = {
                    method: 'GET',
                    url: '/audit?objectChangedId=test.users2@test.api&objectType=users',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function (response) {
                    try {
                        expect(response.statusCode).to.equal(200);
                        expect(response.payload).to.exist();
                        expect(response.payload).to.contain('test.users2@test.api');
                        expect(response.payload).to.not.contain('test.users@test.api');
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
            it('should give audit of all changes done by user', function (done) {
                let request = {
                    method: 'GET',
                    url: '/audit?by=test&objectType=users',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function (response) {
                    try {
                        expect(response.statusCode).to.equal(200);
                        expect(response.payload).to.exist();
                        expect(response.payload).to.contain('test');
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
            it('should give audit of all changes', function (done) {
                let request = {
                    method: 'GET',
                    url: '/audit',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function (response) {
                    try {
                        expect(response.statusCode).to.equal(200);
                        expect(response.payload).to.exist();
                        done();
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

